/// Invoice Registry — core module for creating and managing invoices.
/// Invoices are paid in USDC (FA token). Funds go to escrow on payment.
/// Disputes can be raised by either party and resolved by the arbitrator.
module shelby_invoice::invoice_registry {
    use std::signer;
    use std::string::{Self, String};
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;

    // ─── Errors ──────────────────────────────────────────────────────────────

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_EXISTS: u64 = 2;
    const E_NOT_FOUND: u64 = 3;
    const E_NOT_VENDOR: u64 = 4;
    const E_NOT_PAYER: u64 = 5;
    const E_NOT_ARBITRATOR: u64 = 6;
    const E_INVALID_STATUS: u64 = 7;
    const E_INVALID_AMOUNT: u64 = 8;
    const E_INVALID_ADDRESS: u64 = 9;
    const E_NOT_AUTHORIZED: u64 = 10;
    const E_ALREADY_INITIALIZED: u64 = 11;

    // ─── Constants ───────────────────────────────────────────────────────────

    const STATUS_CREATED: u8 = 0;
    const STATUS_PAID: u8 = 1;
    const STATUS_CANCELLED: u8 = 2;
    const STATUS_DISPUTED: u8 = 3;
    const STATUS_RESOLVED: u8 = 4;

    // USDC FA metadata address on Aptos testnet
    const USDC_METADATA: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct Invoice has store, drop, copy {
        id: u64,
        vendor: address,
        payer: address,
        arbitrator: address,
        beneficiary: address,   // current recipient (vendor by default, buyer after sale)
        amount: u64,            // in USDC smallest unit (6 decimals)
        due_date: u64,          // unix timestamp seconds
        status: u8,
        metadata_hash: vector<u8>, // keccak256 of JSON metadata on Shelby
        shelby_url: String,        // https://api.testnet.shelby.xyz/...
        description: String,
        created_at: u64,
        paid_at: u64,
        dispute_reason: String,
    }

    struct Registry has key {
        invoices: Table<u64, Invoice>,
        next_id: u64,
        admin: address,
        marketplace: address,
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    #[event]
    struct InvoiceCreated has drop, store {
        id: u64,
        vendor: address,
        payer: address,
        arbitrator: address,
        amount: u64,
        due_date: u64,
        shelby_url: String,
    }

    #[event]
    struct InvoicePaid has drop, store {
        id: u64,
        payer: address,
        beneficiary: address,
        amount: u64,
    }

    #[event]
    struct InvoiceCancelled has drop, store {
        id: u64,
        vendor: address,
    }

    #[event]
    struct DisputeRaised has drop, store {
        id: u64,
        raised_by: address,
        reason: String,
    }

    #[event]
    struct DisputeResolved has drop, store {
        id: u64,
        arbitrator: address,
        winner: address,
    }

    #[event]
    struct BeneficiaryTransferred has drop, store {
        id: u64,
        old_beneficiary: address,
        new_beneficiary: address,
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<Registry>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, Registry {
            invoices: table::new(),
            next_id: 1,
            admin: admin_addr,
            marketplace: @0x0,
        });
    }

    public entry fun set_marketplace(admin: &signer, marketplace: address) acquires Registry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<Registry>(admin_addr);
        assert!(registry.admin == admin_addr, E_NOT_AUTHORIZED);
        registry.marketplace = marketplace;
    }

    // ─── Core Functions ──────────────────────────────────────────────────────

    /// Create a new invoice. Vendor specifies payer, arbitrator, amount, due date.
    public entry fun create_invoice(
        vendor: &signer,
        registry_addr: address,
        payer: address,
        arbitrator: address,
        amount: u64,
        due_date: u64,
        description: String,
        metadata_hash: vector<u8>,
        shelby_url: String,
    ) acquires Registry {
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(payer != @0x0, E_INVALID_ADDRESS);
        assert!(arbitrator != @0x0, E_INVALID_ADDRESS);

        let vendor_addr = signer::address_of(vendor);
        let registry = borrow_global_mut<Registry>(registry_addr);
        let id = registry.next_id;
        registry.next_id = id + 1;

        let invoice = Invoice {
            id,
            vendor: vendor_addr,
            payer,
            arbitrator,
            beneficiary: vendor_addr,
            amount,
            due_date,
            status: STATUS_CREATED,
            metadata_hash,
            shelby_url,
            description,
            created_at: timestamp::now_seconds(),
            paid_at: 0,
            dispute_reason: string::utf8(b""),
        };

        table::add(&mut registry.invoices, id, invoice);

        event::emit(InvoiceCreated {
            id,
            vendor: vendor_addr,
            payer,
            arbitrator,
            amount,
            due_date,
            shelby_url,
        });
    }

    /// Pay an invoice. Funds are transferred directly to beneficiary.
    public entry fun pay_invoice(
        payer: &signer,
        registry_addr: address,
        invoice_id: u64,
    ) acquires Registry {
        let payer_addr = signer::address_of(payer);
        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(table::contains(&registry.invoices, invoice_id), E_NOT_FOUND);
        let invoice = table::borrow_mut(&mut registry.invoices, invoice_id);

        assert!(invoice.payer == payer_addr, E_NOT_PAYER);
        assert!(invoice.status == STATUS_CREATED, E_INVALID_STATUS);

        // Transfer USDC from payer to beneficiary
        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA);
        primary_fungible_store::transfer(payer, usdc_metadata, invoice.beneficiary, invoice.amount);

        invoice.status = STATUS_PAID;
        invoice.paid_at = timestamp::now_seconds();

        event::emit(InvoicePaid {
            id: invoice_id,
            payer: payer_addr,
            beneficiary: invoice.beneficiary,
            amount: invoice.amount,
        });
    }

    /// Cancel an invoice. Only vendor can cancel if status is Created.
    public entry fun cancel_invoice(
        vendor: &signer,
        registry_addr: address,
        invoice_id: u64,
    ) acquires Registry {
        let vendor_addr = signer::address_of(vendor);
        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(table::contains(&registry.invoices, invoice_id), E_NOT_FOUND);
        let invoice = table::borrow_mut(&mut registry.invoices, invoice_id);

        assert!(invoice.vendor == vendor_addr, E_NOT_VENDOR);
        assert!(invoice.status == STATUS_CREATED, E_INVALID_STATUS);

        invoice.status = STATUS_CANCELLED;

        event::emit(InvoiceCancelled {
            id: invoice_id,
            vendor: vendor_addr,
        });
    }

    /// Raise a dispute. Either vendor or payer can raise.
    public entry fun raise_dispute(
        caller: &signer,
        registry_addr: address,
        invoice_id: u64,
        reason: String,
    ) acquires Registry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(table::contains(&registry.invoices, invoice_id), E_NOT_FOUND);
        let invoice = table::borrow_mut(&mut registry.invoices, invoice_id);

        assert!(
            invoice.vendor == caller_addr || invoice.payer == caller_addr,
            E_NOT_AUTHORIZED
        );
        assert!(invoice.status == STATUS_CREATED, E_INVALID_STATUS);

        invoice.status = STATUS_DISPUTED;
        invoice.dispute_reason = reason;

        event::emit(DisputeRaised {
            id: invoice_id,
            raised_by: caller_addr,
            reason: invoice.dispute_reason,
        });
    }

    /// Resolve a dispute. Only the designated arbitrator can resolve.
    /// winner must be either vendor or payer.
    public entry fun resolve_dispute(
        arbitrator: &signer,
        registry_addr: address,
        invoice_id: u64,
        winner: address,
    ) acquires Registry {
        let arbitrator_addr = signer::address_of(arbitrator);
        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(table::contains(&registry.invoices, invoice_id), E_NOT_FOUND);
        let invoice = table::borrow_mut(&mut registry.invoices, invoice_id);

        assert!(invoice.arbitrator == arbitrator_addr, E_NOT_ARBITRATOR);
        assert!(invoice.status == STATUS_DISPUTED, E_INVALID_STATUS);
        assert!(
            winner == invoice.vendor || winner == invoice.payer,
            E_INVALID_ADDRESS
        );

        // If payer wins, invoice is cancelled (no payment needed)
        // If vendor wins, payer must pay — update beneficiary and reset to created
        if (winner == invoice.vendor) {
            invoice.status = STATUS_CREATED; // payer must still pay
            invoice.beneficiary = invoice.vendor;
        } else {
            invoice.status = STATUS_CANCELLED; // vendor loses, invoice cancelled
        };

        event::emit(DisputeResolved {
            id: invoice_id,
            arbitrator: arbitrator_addr,
            winner,
        });
    }

    /// Transfer beneficiary (called by marketplace when invoice is sold).
    public entry fun transfer_beneficiary(
        caller: &signer,
        registry_addr: address,
        invoice_id: u64,
        new_beneficiary: address,
    ) acquires Registry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(table::contains(&registry.invoices, invoice_id), E_NOT_FOUND);
        let invoice = table::borrow_mut(&mut registry.invoices, invoice_id);

        // Only marketplace or current beneficiary can transfer
        assert!(
            caller_addr == registry.marketplace || caller_addr == invoice.beneficiary,
            E_NOT_AUTHORIZED
        );
        assert!(invoice.status == STATUS_CREATED, E_INVALID_STATUS);
        assert!(new_beneficiary != @0x0, E_INVALID_ADDRESS);

        let old = invoice.beneficiary;
        invoice.beneficiary = new_beneficiary;

        event::emit(BeneficiaryTransferred {
            id: invoice_id,
            old_beneficiary: old,
            new_beneficiary,
        });
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    #[view]
    public fun get_invoice(registry_addr: address, invoice_id: u64): Invoice acquires Registry {
        let registry = borrow_global<Registry>(registry_addr);
        assert!(table::contains(&registry.invoices, invoice_id), E_NOT_FOUND);
        *table::borrow(&registry.invoices, invoice_id)
    }

    #[view]
    public fun get_next_id(registry_addr: address): u64 acquires Registry {
        borrow_global<Registry>(registry_addr).next_id
    }

    #[view]
    public fun invoice_count(registry_addr: address): u64 acquires Registry {
        borrow_global<Registry>(registry_addr).next_id - 1
    }
}
