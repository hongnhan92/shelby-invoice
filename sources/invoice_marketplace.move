/// Invoice Marketplace — buy and sell invoices at a discount (factoring).
/// Vendor lists invoice for less than face value. Buyer purchases and
/// becomes the new beneficiary, receiving full payment from payer.
module shelby_invoice::invoice_marketplace {
    use std::signer;
    use std::string::String;
    use aptos_std::table::{Self, Table};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::primary_fungible_store;
    use shelby_invoice::invoice_registry;

    // ─── Errors ──────────────────────────────────────────────────────────────

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_EXISTS: u64 = 2;
    const E_NOT_FOUND: u64 = 3;
    const E_NOT_SELLER: u64 = 4;
    const E_INVALID_STATUS: u64 = 5;
    const E_INVALID_PRICE: u64 = 6;
    const E_NOT_AUTHORIZED: u64 = 7;
    const E_ALREADY_INITIALIZED: u64 = 8;

    // ─── Constants ───────────────────────────────────────────────────────────

    const LISTING_ACTIVE: u8 = 0;
    const LISTING_SOLD: u8 = 1;
    const LISTING_CANCELLED: u8 = 2;

    const USDC_METADATA: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Listing has store, drop, copy {
        id: u64,
        invoice_id: u64,
        seller: address,
        price: u64,       // discount price in USDC (less than invoice amount)
        status: u8,
        created_at: u64,
        sold_at: u64,
        buyer: address,
    }

    struct Marketplace has key {
        listings: Table<u64, Listing>,
        next_id: u64,
        admin: address,
        registry_addr: address,
        fee_bps: u64,     // fee in basis points (e.g. 50 = 0.5%)
        fee_collector: address,
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    #[event]
    struct InvoiceListed has drop, store {
        listing_id: u64,
        invoice_id: u64,
        seller: address,
        price: u64,
    }

    #[event]
    struct InvoiceSold has drop, store {
        listing_id: u64,
        invoice_id: u64,
        seller: address,
        buyer: address,
        price: u64,
    }

    #[event]
    struct ListingCancelled has drop, store {
        listing_id: u64,
        invoice_id: u64,
        seller: address,
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    public entry fun initialize(
        admin: &signer,
        registry_addr: address,
        fee_bps: u64,
        fee_collector: address,
    ) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Marketplace>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, Marketplace {
            listings: table::new(),
            next_id: 1,
            admin: admin_addr,
            registry_addr,
            fee_bps,
            fee_collector,
        });
    }

    // ─── Core Functions ──────────────────────────────────────────────────────

    /// List an invoice for sale at a discount price.
    public entry fun list_invoice(
        seller: &signer,
        marketplace_addr: address,
        invoice_id: u64,
        price: u64,
    ) acquires Marketplace {
        assert!(price > 0, E_INVALID_PRICE);
        let seller_addr = signer::address_of(seller);
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);

        let id = marketplace.next_id;
        marketplace.next_id = id + 1;

        let listing = Listing {
            id,
            invoice_id,
            seller: seller_addr,
            price,
            status: LISTING_ACTIVE,
            created_at: timestamp::now_seconds(),
            sold_at: 0,
            buyer: @0x0,
        };

        table::add(&mut marketplace.listings, id, listing);

        event::emit(InvoiceListed {
            listing_id: id,
            invoice_id,
            seller: seller_addr,
            price,
        });
    }

    /// Buy a listed invoice. Buyer pays seller, becomes new beneficiary.
    public entry fun buy_invoice(
        buyer: &signer,
        marketplace_addr: address,
        listing_id: u64,
        registry_addr: address,
    ) acquires Marketplace {
        let buyer_addr = signer::address_of(buyer);
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);

        assert!(table::contains(&marketplace.listings, listing_id), E_NOT_FOUND);
        let listing = table::borrow_mut(&mut marketplace.listings, listing_id);
        assert!(listing.status == LISTING_ACTIVE, E_INVALID_STATUS);

        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA);

        // Calculate fee
        let fee = (listing.price * marketplace.fee_bps) / 10000;
        let seller_amount = listing.price - fee;

        // Transfer payment: buyer → seller (minus fee)
        primary_fungible_store::transfer(buyer, usdc_metadata, listing.seller, seller_amount);

        // Transfer fee to collector
        if (fee > 0) {
            primary_fungible_store::transfer(buyer, usdc_metadata, marketplace.fee_collector, fee);
        };

        // Transfer beneficiary on invoice
        invoice_registry::transfer_beneficiary(
            buyer,
            registry_addr,
            listing.invoice_id,
            buyer_addr,
        );

        listing.status = LISTING_SOLD;
        listing.sold_at = timestamp::now_seconds();
        listing.buyer = buyer_addr;

        event::emit(InvoiceSold {
            listing_id,
            invoice_id: listing.invoice_id,
            seller: listing.seller,
            buyer: buyer_addr,
            price: listing.price,
        });
    }

    /// Cancel a listing. Only seller can cancel.
    public entry fun cancel_listing(
        seller: &signer,
        marketplace_addr: address,
        listing_id: u64,
    ) acquires Marketplace {
        let seller_addr = signer::address_of(seller);
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);

        assert!(table::contains(&marketplace.listings, listing_id), E_NOT_FOUND);
        let listing = table::borrow_mut(&mut marketplace.listings, listing_id);

        assert!(listing.seller == seller_addr, E_NOT_SELLER);
        assert!(listing.status == LISTING_ACTIVE, E_INVALID_STATUS);

        listing.status = LISTING_CANCELLED;

        event::emit(ListingCancelled {
            listing_id,
            invoice_id: listing.invoice_id,
            seller: seller_addr,
        });
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    #[view]
    public fun get_listing(marketplace_addr: address, listing_id: u64): Listing acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        assert!(table::contains(&marketplace.listings, listing_id), E_NOT_FOUND);
        *table::borrow(&marketplace.listings, listing_id)
    }

    #[view]
    public fun listing_count(marketplace_addr: address): u64 acquires Marketplace {
        borrow_global<Marketplace>(marketplace_addr).next_id - 1
    }
}
