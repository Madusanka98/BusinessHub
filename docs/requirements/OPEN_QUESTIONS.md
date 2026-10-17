# Open Questions & Accounting Governance Decisions

This document details unresolved business, financial, and operational decisions for **BusinessHub SaaS**. In accordance with operating instructions, accounting and profit-sharing rules are not invented speculatively; instead, explicit questions are recorded with sensible recommended defaults submitted for user review and approval prior to implementation in Tasks 3 and 4.

---

## Decision Matrix & Recommended Defaults

| # | Domain Area | Business Question | Recommended Default for Review | Architectural / Schema Impact | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Q1** | **Profit Allocation** | Can profit-sharing percentages differ from ownership equity percentages? | **Yes**: Maintain independent fields: `equityPercentage` (for asset ownership/liquidation) and `profitSharePercentage` (for operating dividends). | Two separate decimal fields on the `Membership` or `PartnerEquity` model. | **Pending Review** |
| **Q2** | **Profit-Sharing Default** | If partners do not customize profit sharing, how are dividends split? | **Pro-Rata to Equity**: Default `profitSharePercentage = equityPercentage`. If equity is undefined, split equally (`100% / partners.count`). | Validation constraint ensuring `SUM(profitSharePercentage) == 100.00%`. | **Pending Review** |
| **Q3** | **Additional Capital** | When an existing partner injects additional capital mid-year, does it automatically dilute other partners' equity? | **Manual Re-calculation with Consent**: Additional capital is recorded in the capital ledger immediately, but equity % changes require unanimous owner confirmation. | Add `CapitalContribution` model with `isConfirmed` and `effectiveDate`. | **Pending Review** |
| **Q4** | **Partner Loans** | Are partner loans treated as company debt with interest, or as capital? | **Company Debt (Liability)**: Partner loans are recorded as liabilities. Interest paid is a deductible company expense; principal repayments reduce loan balance without dividend tax. | Separate `PartnerLoan` model from `CapitalContribution`. | **Pending Review** |
| **Q5** | **Expense Approval Threshold** | What should be the default expense amount requiring Business Owner approval? | **$500 (or equivalent local currency, e.g. LKR 150,000)**: Configurable in business settings. Expenses above this amount enter `PENDING_APPROVAL`. | `approvalThreshold` field in `BusinessSettings`. | **Pending Review** |
| **Q6** | **Partner Drawings** | Can a partner withdraw funds without approval from other co-owners? | **Approval Required for All Draws**: Partner withdrawals directly reduce cash and equity; they require approval from at least one non-requesting owner. | `PartnerWithdrawal` with `status: PENDING_APPROVAL`. | **Pending Review** |
| **Q7** | **Operating Loss Allocation** | If a closed period yields a net operating loss, how is the loss absorbed? | **Carried Forward / Equity Offset**: Losses reduce retained earnings balance; if retained earnings are zero, losses reduce partner capital balances proportionally to loss-sharing ratio. | Loss carryover ledger in period closing engine. | **Pending Review** |
| **Q8** | **Retained Earnings Reserve** | Should the system enforce a mandatory reserve deduction before distributing profits? | **Configurable Reserve (Default 20%)**: Owner can specify 0% to 100% to retain for working capital/emergencies before distributing remaining funds. | `reservePercentage` captured in `ClosedPeriod` record. | **Pending Review** |
| **Q9** | **Period Close Immutability** | Can an owner reopen a closed financial period if a late expense receipt is discovered? | **Locked / Reopening Gated**: Closed periods cannot be silently edited. Late items must be posted to the current open period as prior-period adjustments, OR reopening requires audit-logged unanimous owner consent. | Immutable `isLocked` flag on transaction ledgers. | **Pending Review** |
| **Q10** | **Mushroom Scrap Costing** | How should contaminated bags and culled flushes be financially valued? | **Expense Sunk Cost (Material + Labor)**: Contaminated bags forfeit raw materials and labor already consumed, posting a scrap loss entry to the batch cost sheet. | `BatchCost` recalculation factoring in discarded bag count. | **Pending Review** |

---

## Detailed Decision Write-Ups

### Decision 1: Separation of Equity vs. Profit Allocation
- **Context**: In agricultural partnerships, one partner might contribute 70% of the initial capital (70% equity), while an operating partner contributes 30% capital plus all daily farm labor. They agree to split operating profits 50/50.
- **Architectural Proposal**: Separate `equityPercentage` (representing ownership value upon asset liquidation) from `profitSharePercentage` (used during monthly/quarterly dividend distribution).
- **Risk if Not Approved**: Conflating the two prevents sweat-equity partnerships from utilizing the platform.

### Decision 2: Audit Immutability on Rule Changes
- **Context**: If Partner A and Partner B change their profit-sharing ratio from 50/50 to 60/40 in November, what happens to reports from January through October?
- **Architectural Proposal**: Historical financial records and past closed periods must remain permanent and immutable. Changes to profit-sharing percentages are stamped with `effectiveDate` and apply strictly forward-looking to subsequent accounting periods.
- **Invariant**: Historical financial statements never silently change when partnership rules are updated.
