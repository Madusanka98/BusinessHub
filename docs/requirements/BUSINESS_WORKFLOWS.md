# Business Workflows Specification — BusinessHub SaaS

This document establishes the end-to-end operational workflows for **BusinessHub SaaS** using Mermaid diagrams, detailing decision logic, validation gates, authorization checks, and failure paths.

---

## 1. Super Admin Creates Business & Assigns Owners

```mermaid
flowchart TD
    Start([Super Admin Initiates Business Creation]) --> Form[Enter Name, Slug, Max Owners, Primary Owner Email]
    Form --> ValInput{Valid Input & Slug Unique?}
    
    ValInput -- No --> ShowErr1[Show Validation Error / Duplicate Slug Alert]
    ShowErr1 --> Form
    
    ValInput -- Yes --> ValLimit{1 <= Max Owners <= 10?}
    ValLimit -- No --> ShowErr2[Reject: Max Owners must be 1 to 10]
    ShowErr2 --> Form
    
    ValLimit -- Yes --> DBInsert[DB Transaction: Create Business 'PENDING_SETUP'<br/>Generate Cryptographic 256-bit Token<br/>Record 'PENDING' Invite]
    DBInsert --> EmailDispatch[Dispatch Secure Onboarding Email<br/>with Expiring Link 48h TTL]
    EmailDispatch --> AuditLog[Write PlatformAuditLog Event]
    AuditLog --> Complete([Business Created & Invite Dispatched])
```

---

## 2. Owner Accepts Invitation & Sets Up Account

```mermaid
flowchart TD
    Start([User Clicks Invitation Link in Email]) --> ParseToken[Extract Token Hash from URL]
    ParseToken --> CheckToken{Token in DB & Status == PENDING?}
    
    CheckToken -- No --> CheckConsumed{Status == CONSUMED?}
    CheckConsumed -- Yes --> ErrConsumed[Error: 'This invitation has already been used.']
    CheckConsumed -- No --> ErrInvalid[Error: 'Invalid or expired invitation link.']
    
    CheckToken -- Yes --> CheckExpiry{expiresAt > now()?}
    CheckExpiry -- No --> ErrExpired[Error: 'Invitation has expired. Request a new link.']
    
    CheckExpiry -- Yes --> CheckExistingUser{Email already has a User account?}
    
    CheckExistingUser -- Yes --> LoginPrompt[Prompt User to Authenticate with Existing Password]
    LoginPrompt --> AuthSuccess{Credentials Valid?}
    AuthSuccess -- No --> LoginPrompt
    AuthSuccess -- Yes --> LinkMembership[Create Business Membership Role: OWNER<br/>Mark Token CONSUMED<br/>Set Business Status: ACTIVE]
    LinkMembership --> DoneDashboard([Redirect to Business Dashboard])
    
    CheckExistingUser -- No --> DisplaySetupForm[Display Account Setup Form:<br/>Full Name, Password, Confirm Password]
    DisplaySetupForm --> ValidatePwd{Password Policy Met?<br/>>=10 chars, upper, lower, number, symbol}
    ValidatePwd -- No --> FormErr[Display Password Requirements Error]
    FormErr --> DisplaySetupForm
    
    ValidatePwd -- Yes --> CreateUserRecord[DB Transaction:<br/>Hash Password Argon2id<br/>Create User Record<br/>Create Membership Role: OWNER<br/>Mark Token CONSUMED<br/>Set Business Status: ACTIVE]
    CreateUserRecord --> AutoLogin[Establish Authenticated Session Cookie]
    AutoLogin --> DoneDashboard
```

---

## 3. Owner Invites Partner or Staff Member

```mermaid
flowchart TD
    Start([Owner Initiates Invite Modal]) --> FormInput[Input Email, Select Role: Co-Owner / Partner / Staff]
    FormInput --> CheckRole{Selected Role == Co-Owner?}
    
    CheckRole -- Yes --> QueryOwnerCount[Count Active Owners + Pending Owner Invites]
    QueryOwnerCount --> CheckLimit{Count < maxOwners?}
    CheckLimit -- No --> RejectLimit[Reject: 'Maximum owner limit reached. Cannot invite more co-owners.']
    
    CheckRole -- No --> CheckMemberExists[Query if Email is already active in this Business]
    CheckLimit -- Yes --> CheckMemberExists
    
    CheckMemberExists --> MemberFound{Already a Member?}
    MemberFound -- Yes --> RejectMember[Reject: 'User is already an active member of this business.']
    
    MemberFound -- No --> GenToken[Generate Cryptographic Single-Use Token<br/>expiresAt = now() + 48h<br/>Store SHA-256 Hash]
    GenToken --> SendInviteMail[Send Email: 'You have been invited to join BusinessName']
    SendInviteMail --> LogEvent[Write Tenant AuditLog Event: MEMBER_INVITED]
    LogEvent --> Success([Invite Pending in Member Table])
```

---

## 4. Existing User Joins Another Business

```mermaid
flowchart TD
    Start([Existing User Receives Invite to Business B]) --> ClickLink[Clicks Single-Use Token Link]
    ClickLink --> ValToken{Token Valid & Active?}
    ValToken -- No --> FailLink[Display Expiration / Invalid Notice]
    
    ValToken -- Yes --> SystemDetects[System Identifies Email Matches Existing User ID]
    SystemDetects --> CheckSession{User Currently Logged In?}
    
    CheckSession -- No --> ShowLogin[Show Sign-In Screen with Business Context Banner]
    ShowLogin --> Authenticate[User Enters Existing Password]
    
    CheckSession -- Yes --> ConfirmScreen[Display Confirmation Modal:<br/>'Accept invitation to join Business B as Role?']
    Authenticate --> ConfirmScreen
    
    ConfirmScreen --> UserDecision{Accept Invitation?}
    UserDecision -- No --> TokenRevoked[Invitation Stays Pending or User Declines]
    
    UserDecision -- Yes --> DBAttach[DB Transaction:<br/>Create Membership Record User -> Business B<br/>Mark Token CONSUMED<br/>AuditLog: MEMBER_ONBOARDED]
    DBAttach --> SwitchTenant[Update Active Session to Business B]
    SwitchTenant --> DashboardB([Open Business B Dashboard])
```

---

## 5. User Switches Between Authorized Businesses

```mermaid
flowchart TD
    Start([User Clicks Business Selector in Header]) --> FetchMemberships[Query all active Memberships for Session UserID]
    FetchMemberships --> RenderDropdown[Render Business Dropdown List with Role Badges]
    RenderDropdown --> SelectBusiness[User Clicks Business B]
    
    SelectBusiness --> ServerCheck{Membership in Business B Active & Status != SUSPENDED?}
    ServerCheck -- No --> BlockSwitch[Display Error: 'Access denied or business is suspended.']
    
    ServerCheck -- Yes --> UpdateSession[Update Session State: currentBusinessId = Business B<br/>Set Secure HttpOnly Cookie]
    UpdateSession --> RecomputePermissions[Recompute Permissions for Role in Business B]
    RecomputePermissions --> RefreshRoute[Client Navigates to /dashboard with New Tenant Context]
    RefreshRoute --> EndState([Active Context Switched Successfully])
```

---

## 6. User Records Income or Expense

```mermaid
flowchart TD
    Start([User Opens New Transaction Modal]) --> Form[Enter Type, Amount, Category, Date, Method, Description]
    Form --> AttachmentCheck{Receipt File Attached?}
    
    AttachmentCheck -- Yes --> ValidateFile{File <= 5MB and .jpg/.png/.pdf?}
    ValidateFile -- No --> FileErr[Reject: 'Invalid receipt file type or size > 5MB']
    FileErr --> Form
    ValidateFile -- Yes --> UploadStorage[Save Receipt to Secure Storage & Hash Filename]
    UploadStorage --> ValidateForm[Validate Fields with Zod Schema]
    
    AttachmentCheck -- No --> ValidateForm
    
    ValidateForm --> AmountCheck{Amount > 0?}
    AmountCheck -- No --> AmountErr[Reject: 'Amount must be greater than zero.']
    AmountErr --> Form
    
    AmountCheck -- Yes --> ThresholdCheck{Type == Expense AND Amount > Approval Threshold?}
    
    ThresholdCheck -- Yes --> SavePending[Save Transaction Status: PENDING_APPROVAL<br/>businessId = session.businessId]
    SavePending --> NotifyOwner[Notify Business Owners of Pending Approval]
    NotifyOwner --> FinishPending([Transaction Awaiting Owner Review])
    
    ThresholdCheck -- No --> SaveActive[Save Transaction Status: ACTIVE<br/>businessId = session.businessId]
    SaveActive --> UpdateLedger[Increment Cash/Expense Account Balance]
    UpdateLedger --> AuditTx[Write AuditLog: TRANSACTION_CREATED]
    AuditTx --> FinishActive([Transaction Committed to Ledger])
```

---

## 7. Owner Approves or Rejects a Transaction

```mermaid
flowchart TD
    Start([Owner Opens Pending Approval Queue]) --> ViewTx[Inspect Transaction Details, Category & Receipt Image]
    ViewTx --> CheckSelfApproval{Is Owner also the Submitter?}
    
    CheckSelfApproval -- Yes --> SoleOwnerCheck{Is Submitter the Sole Owner?}
    SoleOwnerCheck -- No --> BlockSelfApprove[Block: 'Approval requires a different business owner.']
    SoleOwnerCheck -- Yes --> Decision{Owner Decision}
    
    CheckSelfApproval -- No --> Decision{Owner Decision}
    
    Decision -- Approve --> DBApprove[DB Transaction:<br/>Set Status = ACTIVE<br/>Set approvedBy = OwnerID<br/>Set approvedAt = now()]
    DBApprove --> UpdateFinancials[Update Financial Statements & Net Profit Totals]
    UpdateFinancials --> LogApprove[AuditLog: TRANSACTION_APPROVED]
    LogApprove --> DoneApprove([Transaction Approved & Active])
    
    Decision -- Reject --> EnterComment[Require Mandatory Rejection Reason]
    EnterComment --> DBReject[DB Transaction:<br/>Set Status = REJECTED<br/>Set rejectionReason = Comment]
    DBReject --> LogReject[AuditLog: TRANSACTION_REJECTED]
    LogReject --> DoneReject([Transaction Rejected & Archived])
```

---

## 8. Business Calculates Profit Distribution for a Closed Period

```mermaid
flowchart TD
    Start([Owner Initiates Period Close]) --> SelectPeriod[Select Date Range: e.g., October 2026]
    SelectPeriod --> CheckOpenItems{Unapproved Pending Transactions in Range?}
    
    CheckOpenItems -- Yes --> WarningPending[Warn: 'Must approve or reject pending expenses before closing.']
    WarningPending --> Halt([Halt Close Process])
    
    CheckOpenItems -- No --> ComputeNetProfit[Calculate Total Income - Total Expenses = Net Profit]
    ComputeNetProfit --> ProfitCheck{Net Profit > 0?}
    
    ProfitCheck -- No --> HandleLoss[Calculate Loss Allocation according to Loss Ratio<br/>Carry forward or debit partner capital]
    HandleLoss --> LockPeriod[Lock Accounting Period Date Range]
    
    ProfitCheck -- Yes --> InputReserve[Prompt Owner for Retained Earnings %<br/>e.g., 20% Reserve]
    InputReserve --> ComputeDistributable[Distributable Profit = Net Profit * 1 - Reserve%]
    ComputeDistributable --> DistributePerPartner[For Each Partner:<br/>Share = Distributable Profit * profitSharePercentage<br/>Credit to Partner Drawing Account]
    DistributePerPartner --> LockPeriod
    
    LockPeriod --> SetClosed[Set Period Status: CLOSED<br/>Transactions in Range Locked from Editing]
    SetClosed --> GenerateStatements[Generate Partner Profit Statements PDF]
    GenerateStatements --> AuditClose[AuditLog: PERIOD_CLOSED_DISTRIBUTED]
    AuditClose --> EndPeriod([Period Finalized & Ledger Locked])
```

---

## 9. Mushroom Production: Batch Creation through Harvest & Sales

```mermaid
flowchart TD
    Start([Technician Launches New Batch]) --> SelectRecipe[Select Strain, Recipe BOM & Target Bag Count]
    SelectRecipe --> DeductRawMaterials[Check Stock & Deduct Raw Substrate/Spawn from Core Inventory]
    DeductRawMaterials --> GenBatchCode[Generate Batch ID: MB-STRAIN-YYYYMMDD-SEQ]
    GenBatchCode --> PhasePrep[Phase: PREPARATION -> Mixing & Bag Filling]
    
    PhasePrep --> PhaseSterile[Phase: STERILIZATION -> Autoclaving / Steaming]
    PhaseSterile --> PhaseInoc[Phase: INOCULATION -> Cleanroom Grain Spawn Addition]
    PhaseInoc --> PhaseIncubate[Phase: INCUBATION -> Dark Room Colonization Monitoring]
    
    PhaseIncubate --> CheckContam1{Contamination Detected?}
    CheckContam1 -- Yes --> LogDiscard1[Log Discarded Bags & Reason Code<br/>Decrement Viable Count]
    LogDiscard1 --> CheckViable{Viable Bags Remaining?}
    CheckViable -- No --> TerminateBatch([Batch Terminated as Contaminated])
    CheckViable -- Yes --> ColonizedCheck{100% Colonized?}
    CheckContam1 -- No --> ColonizedCheck
    
    ColonizedCheck -- No --> PhaseIncubate
    ColonizedCheck -- Yes --> MoveFruiting[Phase: FRUITING -> Transfer to Chamber Room ID]
    
    MoveFruiting --> DailyCare[Daily Care: Watering, Airflow, Temperature & RH Logs]
    DailyCare --> ReadyHarvest{Pinheads Mature to Flush Harvest?}
    ReadyHarvest -- No --> DailyCare
    
    ReadyHarvest -- Yes --> LogHarvest[Log Harvest: Date, Flush #, Fresh Weight kg, Quality Grade]
    LogHarvest --> AutoStockFresh[Auto-Increment Core Inventory: Fresh Mushroom Stock]
    AutoStockFresh --> RouteHarvest{Stock Destination?}
    
    RouteHarvest -- Fresh Wholesale / Retail --> CreateSalesOrder[Fulfill Customer Order -> Invoice & Payment]
    CreateSalesOrder --> FinishCycle([Fresh Sales Completed])
    
    RouteHarvest -- Dehydration Processing --> DryingChamber[Transfer Fresh Stock to Drying Chamber]
    DryingChamber --> OutDried[Record Final Dried Weight kg<br/>Compute Yield Ratio & Increment Dried SKU Stock]
    OutDried --> DriedSales[Package & Sell Dried Mushrooms]
    DriedSales --> FinishCycle
    
    LogHarvest --> NextFlush{Batch Capable of Another Flush?}
    NextFlush -- Yes --> MoveFruiting
    NextFlush -- No --> SpendSubstrate[Mark Batch COMPLETED -> Dispose Spent Compost]
    SpendSubstrate --> FinishCycle
```

---

## 10. Business Archival or Membership Revocation

```mermaid
flowchart TD
    StartRevocation([Owner Revokes Membership]) --> CheckOwnerSeat{Is Member an Owner?}
    
    CheckOwnerSeat -- Yes --> CountRemainingOwners[Count Other Active Owners in Business]
    CountRemainingOwners --> SoleOwnerCheck{Remaining Owners < 1?}
    SoleOwnerCheck -- Yes --> BlockRevoke[Block: 'Cannot revoke the sole owner of a business. Transfer ownership first.']
    SoleOwnerCheck -- No --> ExecuteRevoke[Set Membership Status: REVOKED<br/>Invalidate all active user sessions for this tenant]
    
    CheckOwnerSeat -- No --> ExecuteRevoke
    
    ExecuteRevoke --> AuditRevoke[Write Tenant AuditLog: MEMBERSHIP_REVOKED]
    AuditRevoke --> EndRevoke([Access Terminated])
    
    StartArchive([Super Admin or Sole Owner Archives Business]) --> VerifyAuth{Authorized to Archive?}
    VerifyAuth -- No --> BlockArchive[Reject: Unauthorized]
    
    VerifyAuth -- Yes --> ConfirmModal[Require Explicit Confirmation Typing Business Name]
    ConfirmModal --> SoftDelete[Set Business Status: ARCHIVED<br/>All Memberships set to INACTIVE<br/>Data retained in read-only cold state]
    SoftDelete --> InvalidateTokens[Invalidate All Active Sessions & Pending Invites]
    InvalidateTokens --> AuditArchive[Write AuditLog: BUSINESS_ARCHIVED]
    AuditArchive --> EndArchive([Business Archived])
```
