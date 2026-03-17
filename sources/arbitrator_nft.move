/// Arbitrator NFT — three-tier NFT system for dispute resolution.
/// Tiers: Gold (1) → Diamond (2) → Platinum (3)
/// Arbitrators earn reputation by resolving disputes fairly.
/// Slashing reduces reputation; enough slashes downgrade tier.
module shelby_invoice::arbitrator_nft {
    use std::signer;
    use std::string::{Self, String};
    use aptos_std::table::{Self, Table};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::Metadata;
    use aptos_framework::primary_fungible_store;

    // ─── Errors ──────────────────────────────────────────────────────────────

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_EXISTS: u64 = 2;
    const E_NOT_FOUND: u64 = 3;
    const E_INSUFFICIENT_REPUTATION: u64 = 4;
    const E_INSUFFICIENT_DISPUTES: u64 = 5;
    const E_ALREADY_MAX_TIER: u64 = 6;
    const E_NOT_AUTHORIZED: u64 = 7;
    const E_ALREADY_INITIALIZED: u64 = 8;
    const E_ALREADY_ARBITRATOR: u64 = 9;

    // ─── Constants ───────────────────────────────────────────────────────────

    const TIER_GOLD: u8 = 1;
    const TIER_DIAMOND: u8 = 2;
    const TIER_PLATINUM: u8 = 3;

    // Mint fees in USDC (6 decimals)
    const GOLD_MINT_FEE: u64 = 10_000_000;     // 10 USDC
    const DIAMOND_MINT_FEE: u64 = 500_000_000;  // 500 USDC
    const PLATINUM_MINT_FEE: u64 = 2_000_000_000; // 2000 USDC

    // Upgrade requirements
    const DIAMOND_MIN_DISPUTES: u64 = 10;
    const DIAMOND_MIN_REPUTATION: u64 = 80; // 80%
    const PLATINUM_MIN_DISPUTES: u64 = 50;
    const PLATINUM_MIN_REPUTATION: u64 = 95; // 95%

    const USDC_METADATA: address = @0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832;

    // ─── Structs ─────────────────────────────────────────────────────────────

    struct ArbitratorProfile has store, drop, copy {
        owner: address,
        tier: u8,
        disputes_resolved: u64,
        disputes_total: u64,
        reputation_score: u64,  // 0-100 percentage
        minted_at: u64,
        last_active: u64,
        shelby_url: String,     // NFT metadata on Shelby
    }

    struct ArbitratorRegistry has key {
        profiles: Table<address, ArbitratorProfile>,
        admin: address,
        fee_collector: address,
        total_arbitrators: u64,
        authorized_resolvers: Table<address, bool>, // invoice_registry addresses
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    #[event]
    struct ArbitratorMinted has drop, store {
        owner: address,
        tier: u8,
        fee_paid: u64,
    }

    #[event]
    struct ArbitratorUpgraded has drop, store {
        owner: address,
        old_tier: u8,
        new_tier: u8,
    }

    #[event]
    struct ArbitratorSlashed has drop, store {
        owner: address,
        reason: String,
        new_reputation: u64,
    }

    #[event]
    struct ReputationUpdated has drop, store {
        owner: address,
        disputes_resolved: u64,
        reputation_score: u64,
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    public entry fun initialize(admin: &signer, fee_collector: address) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<ArbitratorRegistry>(admin_addr), E_ALREADY_INITIALIZED);

        move_to(admin, ArbitratorRegistry {
            profiles: table::new(),
            admin: admin_addr,
            fee_collector,
            total_arbitrators: 0,
            authorized_resolvers: table::new(),
        });
    }

    public entry fun authorize_resolver(
        admin: &signer,
        registry_addr: address,
        resolver: address,
    ) acquires ArbitratorRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<ArbitratorRegistry>(registry_addr);
        assert!(registry.admin == admin_addr, E_NOT_AUTHORIZED);
        table::upsert(&mut registry.authorized_resolvers, resolver, true);
    }

    // ─── Core Functions ──────────────────────────────────────────────────────

    /// Mint a Gold tier arbitrator NFT.
    public entry fun mint_gold(
        caller: &signer,
        registry_addr: address,
        shelby_url: String,
    ) acquires ArbitratorRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<ArbitratorRegistry>(registry_addr);

        assert!(!table::contains(&registry.profiles, caller_addr), E_ALREADY_ARBITRATOR);

        // Charge mint fee
        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA);
        primary_fungible_store::transfer(caller, usdc_metadata, registry.fee_collector, GOLD_MINT_FEE);

        let profile = ArbitratorProfile {
            owner: caller_addr,
            tier: TIER_GOLD,
            disputes_resolved: 0,
            disputes_total: 0,
            reputation_score: 100,
            minted_at: timestamp::now_seconds(),
            last_active: timestamp::now_seconds(),
            shelby_url,
        };

        table::add(&mut registry.profiles, caller_addr, profile);
        registry.total_arbitrators = registry.total_arbitrators + 1;

        event::emit(ArbitratorMinted {
            owner: caller_addr,
            tier: TIER_GOLD,
            fee_paid: GOLD_MINT_FEE,
        });
    }

    /// Upgrade from Gold to Diamond. Requires 10 disputes + 80% reputation.
    public entry fun upgrade_to_diamond(
        caller: &signer,
        registry_addr: address,
    ) acquires ArbitratorRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<ArbitratorRegistry>(registry_addr);

        assert!(table::contains(&registry.profiles, caller_addr), E_NOT_FOUND);
        let profile = table::borrow_mut(&mut registry.profiles, caller_addr);

        assert!(profile.tier == TIER_GOLD, E_ALREADY_MAX_TIER);
        assert!(profile.disputes_resolved >= DIAMOND_MIN_DISPUTES, E_INSUFFICIENT_DISPUTES);
        assert!(profile.reputation_score >= DIAMOND_MIN_REPUTATION, E_INSUFFICIENT_REPUTATION);

        // Charge upgrade fee
        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA);
        primary_fungible_store::transfer(caller, usdc_metadata, registry.fee_collector, DIAMOND_MINT_FEE);

        let old_tier = profile.tier;
        profile.tier = TIER_DIAMOND;

        event::emit(ArbitratorUpgraded {
            owner: caller_addr,
            old_tier,
            new_tier: TIER_DIAMOND,
        });
    }

    /// Upgrade from Diamond to Platinum. Requires 50 disputes + 95% reputation.
    public entry fun upgrade_to_platinum(
        caller: &signer,
        registry_addr: address,
    ) acquires ArbitratorRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<ArbitratorRegistry>(registry_addr);

        assert!(table::contains(&registry.profiles, caller_addr), E_NOT_FOUND);
        let profile = table::borrow_mut(&mut registry.profiles, caller_addr);

        assert!(profile.tier == TIER_DIAMOND, E_ALREADY_MAX_TIER);
        assert!(profile.disputes_resolved >= PLATINUM_MIN_DISPUTES, E_INSUFFICIENT_DISPUTES);
        assert!(profile.reputation_score >= PLATINUM_MIN_REPUTATION, E_INSUFFICIENT_REPUTATION);

        // Charge upgrade fee
        let usdc_metadata = object::address_to_object<Metadata>(USDC_METADATA);
        primary_fungible_store::transfer(caller, usdc_metadata, registry.fee_collector, PLATINUM_MINT_FEE);

        let old_tier = profile.tier;
        profile.tier = TIER_PLATINUM;

        event::emit(ArbitratorUpgraded {
            owner: caller_addr,
            old_tier,
            new_tier: TIER_PLATINUM,
        });
    }

    /// Update reputation after dispute resolution (called by authorized resolver).
    public entry fun record_resolution(
        resolver: &signer,
        registry_addr: address,
        arbitrator: address,
        was_fair: bool,
    ) acquires ArbitratorRegistry {
        let resolver_addr = signer::address_of(resolver);
        let registry = borrow_global_mut<ArbitratorRegistry>(registry_addr);

        assert!(
            table::contains(&registry.authorized_resolvers, resolver_addr),
            E_NOT_AUTHORIZED
        );
        assert!(table::contains(&registry.profiles, arbitrator), E_NOT_FOUND);

        let profile = table::borrow_mut(&mut registry.profiles, arbitrator);
        profile.disputes_total = profile.disputes_total + 1;
        profile.last_active = timestamp::now_seconds();

        if (was_fair) {
            profile.disputes_resolved = profile.disputes_resolved + 1;
        };

        // Recalculate reputation
        if (profile.disputes_total > 0) {
            profile.reputation_score = (profile.disputes_resolved * 100) / profile.disputes_total;
        };

        // Downgrade if reputation falls below threshold
        if (profile.tier == TIER_PLATINUM && profile.reputation_score < DIAMOND_MIN_REPUTATION) {
            profile.tier = TIER_GOLD;
        } else if (profile.tier == TIER_DIAMOND && profile.reputation_score < DIAMOND_MIN_REPUTATION) {
            profile.tier = TIER_GOLD;
        };

        event::emit(ReputationUpdated {
            owner: arbitrator,
            disputes_resolved: profile.disputes_resolved,
            reputation_score: profile.reputation_score,
        });
    }

    /// Slash an arbitrator for misconduct. Admin only.
    public entry fun slash(
        admin: &signer,
        registry_addr: address,
        arbitrator: address,
        reason: String,
        slash_points: u64,
    ) acquires ArbitratorRegistry {
        let admin_addr = signer::address_of(admin);
        let registry = borrow_global_mut<ArbitratorRegistry>(registry_addr);

        assert!(registry.admin == admin_addr, E_NOT_AUTHORIZED);
        assert!(table::contains(&registry.profiles, arbitrator), E_NOT_FOUND);

        let profile = table::borrow_mut(&mut registry.profiles, arbitrator);

        if (profile.reputation_score >= slash_points) {
            profile.reputation_score = profile.reputation_score - slash_points;
        } else {
            profile.reputation_score = 0;
        };

        // Downgrade if below threshold
        if (profile.tier == TIER_PLATINUM && profile.reputation_score < PLATINUM_MIN_REPUTATION) {
            profile.tier = TIER_DIAMOND;
        };
        if (profile.tier == TIER_DIAMOND && profile.reputation_score < DIAMOND_MIN_REPUTATION) {
            profile.tier = TIER_GOLD;
        };

        event::emit(ArbitratorSlashed {
            owner: arbitrator,
            reason,
            new_reputation: profile.reputation_score,
        });
    }

    // ─── View Functions ──────────────────────────────────────────────────────

    #[view]
    public fun get_profile(registry_addr: address, arbitrator: address): ArbitratorProfile acquires ArbitratorRegistry {
        let registry = borrow_global<ArbitratorRegistry>(registry_addr);
        assert!(table::contains(&registry.profiles, arbitrator), E_NOT_FOUND);
        *table::borrow(&registry.profiles, arbitrator)
    }

    #[view]
    public fun is_arbitrator(registry_addr: address, addr: address): bool acquires ArbitratorRegistry {
        let registry = borrow_global<ArbitratorRegistry>(registry_addr);
        table::contains(&registry.profiles, addr)
    }

    #[view]
    public fun get_tier(registry_addr: address, addr: address): u8 acquires ArbitratorRegistry {
        let registry = borrow_global<ArbitratorRegistry>(registry_addr);
        if (!table::contains(&registry.profiles, addr)) return 0;
        table::borrow(&registry.profiles, addr).tier
    }

    #[view]
    public fun total_arbitrators(registry_addr: address): u64 acquires ArbitratorRegistry {
        borrow_global<ArbitratorRegistry>(registry_addr).total_arbitrators
    }

    #[view]
    public fun gold_mint_fee(): u64 { GOLD_MINT_FEE }

    #[view]
    public fun diamond_mint_fee(): u64 { DIAMOND_MINT_FEE }

    #[view]
    public fun platinum_mint_fee(): u64 { PLATINUM_MINT_FEE }
}
