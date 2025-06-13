# Change Management Risk Assessment Policy

## Document Information
- **Document Title**: Change Management Risk Assessment Calculation Policy
- **Version**: 1.0
- **Last Updated**: December 2024
- **Document Type**: Technical Policy Documentation
- **Scope**: Freshworks Change Management Application

## 1. Overview

This document defines the standardized risk assessment methodology used by the Freshworks Change Management Application to evaluate and categorize change requests based on their potential impact and complexity.

## 2. Risk Assessment Framework

### 2.1 Assessment Criteria

The risk assessment is based on **five (5) key criteria**, each scored on a scale of 1-3 points:

| Criteria | Description | Score Range |
|----------|-------------|-------------|
| **Business Impact** | Potential impact if the change fails | 1-3 points |
| **Affected Users** | Number of users impacted by the change | 1-3 points |
| **Complexity** | Technical complexity of the change | 1-3 points |
| **Testing Level** | Extent of testing performed | 1-3 points |
| **Rollback Capability** | Availability and quality of rollback procedures | 1-3 points |

### 2.2 Detailed Scoring Criteria

#### 2.2.1 Business Impact
- **Score 1 (Low)**: Limited impact on business operations
- **Score 2 (Medium)**: Noticeable impact on some business operations  
- **Score 3 (High)**: Significant impact on business operations

#### 2.2.2 Affected Users
- **Score 1 (Few)**: Less than 50 users affected
- **Score 2 (Some)**: 50-200 users affected
- **Score 3 (Many)**: More than 200 users affected

#### 2.2.3 Complexity
- **Score 1 (Simple)**: Routine change with established procedures
- **Score 2 (Moderate)**: Some complexity but well understood
- **Score 3 (Complex)**: Multiple systems or uncommon procedures

#### 2.2.4 Testing Level
- **Score 1 (Comprehensive)**: Thoroughly tested in multiple environments
- **Score 2 (Adequate)**: Primary functions tested in test environment
- **Score 3 (Limited)**: Minimal testing or testing not possible

#### 2.2.5 Rollback Capability
- **Score 1 (Yes)**: Detailed rollback plan with proven procedures
- **Score 2 (Partial)**: Basic rollback steps identified
- **Score 3 (No)**: No rollback possible or very difficult

## 3. Risk Score Calculation

### 3.1 Calculation Method

The **Total Risk Score** is calculated as the sum of all five criteria scores:

```
Total Risk Score = Business Impact + Affected Users + Complexity + Testing Level + Rollback Capability
```

**Score Range**: 5-15 points (minimum 5, maximum 15)

### 3.2 Risk Level Determination

Based on the Total Risk Score, changes are categorized into three risk levels:

| Total Score | Risk Level | Description |
|-------------|------------|-------------|
| **5-7 points** | **Low Risk** | Standard approval processes apply |
| **8-11 points** | **Medium Risk** | Additional review and approval may be required |
| **12-15 points** | **High Risk** | Extensive review, testing, and senior approval required |

### 3.3 Mathematical Logic Implementation

```javascript
// Risk Level Determination Logic
if (totalScore <= 7) {
    riskLevel = 'Low';
    explanation = 'This change has a low risk profile. Standard approval processes apply.';
} else if (totalScore <= 11) {
    riskLevel = 'Medium';
    explanation = 'This change has a medium risk profile. Additional review and approval may be required.';
} else {
    riskLevel = 'High';
    explanation = 'This change has a high risk profile. Extensive review, testing, and senior approval are required.';
}
```

## 4. Risk Level Processing Rules

### 4.1 Priority Assignment

Risk levels automatically influence change request priority:

- **Low Risk** → **Low Priority** (Priority Level 1)
- **Medium Risk** → **Medium Priority** (Priority Level 2)  
- **High Risk** → **High Priority** (Priority Level 3)

### 4.2 Impact Assignment

Impact levels are calculated based on both risk level and asset scope:

```javascript
// Impact Calculation Logic
let impact = 2; // Default to Medium impact

if (riskLevel === 'High' || assetCount > 5) {
    impact = 3; // High impact
} else if (riskLevel === 'Low' && assetCount <= 2) {
    impact = 1; // Low impact
}
```

### 4.3 Approval Workflow Rules

| Risk Level | Approval Requirements | Workflow Type |
|------------|----------------------|---------------|
| **Low** | Standard approval process | Single approver or parallel |
| **Medium** | Additional review required | Parallel approval |
| **High** | Extensive review and senior approval | Sequential approval |

### 4.4 Peer Review Requirements

- **Low Risk**: No peer review required
- **Medium Risk**: Peer review task created (24-hour deadline)
- **High Risk**: Mandatory peer review task created (24-hour deadline, high priority)

## 5. Validation Rules

### 5.1 Mandatory Assessment

All change requests **MUST** complete the risk assessment before submission. The system enforces:

1. **All five criteria must be answered** - No partial assessments allowed
2. **Automatic calculation** - Risk score and level calculated in real-time
3. **Validation on submission** - Cannot proceed without completed assessment

### 5.2 Assessment Dependencies

Risk assessment completion is required before:
- Final change request submission
- Workflow creation
- Approval routing
- Notification distribution

## 6. Examples

### 6.1 Low Risk Example (Score: 6)
- Business Impact: 1 (Limited impact)
- Affected Users: 1 (< 50 users)
- Complexity: 1 (Simple, routine)
- Testing: 2 (Adequate testing)
- Rollback: 1 (Detailed rollback plan)
- **Total: 6 points → Low Risk**

### 6.2 Medium Risk Example (Score: 9)
- Business Impact: 2 (Noticeable impact)
- Affected Users: 2 (50-200 users)
- Complexity: 2 (Moderate complexity)
- Testing: 2 (Adequate testing)
- Rollback: 1 (Detailed rollback plan)
- **Total: 9 points → Medium Risk**

### 6.3 High Risk Example (Score: 13)
- Business Impact: 3 (Significant impact)
- Affected Users: 3 (> 200 users)
- Complexity: 3 (Complex, multiple systems)
- Testing: 3 (Limited testing)
- Rollback: 1 (Detailed rollback plan)
- **Total: 13 points → High Risk**

## 7. System Implementation

### 7.1 User Interface
- Interactive radio button selection for each criteria
- Real-time calculation and display of risk score and level
- Color-coded risk level indicators:
  - **Low**: Green badge (bg-success)
  - **Medium**: Yellow badge (bg-warning)  
  - **High**: Red badge (bg-danger)

### 7.2 Data Storage
Risk assessment data is stored in the following structure:
```javascript
riskAssessment: {
    businessImpact: integer,     // 1-3
    affectedUsers: integer,      // 1-3  
    complexity: integer,         // 1-3
    testing: integer,           // 1-3
    rollback: integer,          // 1-3
    totalScore: integer,        // 5-15
    riskLevel: string          // 'Low', 'Medium', or 'High'
}
```

#### 7.2.1 Custom Fields Integration
The system populates specific Freshservice custom fields that exist in the instance:
```javascript
custom_fields: {
    risks: null,                    // Reserved for risk documentation
    lf_technical_owner: null        // Primary technical owner (from impacted services analysis)
}
```

### 7.3 API Integration

#### 7.3.1 Field Mappings
Based on the actual Freshservice instance schema, risk assessments are mapped as follows:

**Risk Level Mapping:**
- **Low Risk** → `risk: 1`
- **Medium Risk** → `risk: 2`
- **High Risk** → `risk: 3`
- **Very High Risk** → `risk: 4` (available but not currently used)

**Priority Mapping:**
- **Low Risk** → `priority: 1` (Low)
- **Medium Risk** → `priority: 2` (Medium)
- **High Risk** → `priority: 3` (High)
- **Critical Changes** → `priority: 4` (Urgent)

**Change Type Mapping:**
- **Standard Changes** → `change_type: 6` (Normal Change)
- **Emergency Changes** → `change_type: 4` (Emergency)

**Impact Calculation:**
```javascript
// Impact based on risk level and asset scope
let impact = 2; // Default to Medium impact

if (riskLevel === 'High' || assetCount > 5) {
    impact = 3; // High impact
} else if (riskLevel === 'Low' && assetCount <= 2) {
    impact = 1; // Low impact
}
```

#### 7.3.2 Standard Planning Fields
The system populates the following standard Freshservice planning fields:
- `change_reason` - Reason for the change
- `change_impact` - Impact description (mapped from implementation plan)
- `change_plan` - Rollout plan (mapped from implementation plan)
- `backout_plan` - Backout procedures

#### 7.3.3 Required Fields
- `workspace_id: 2` - "Change Management" workspace (required)
- `subject` - Change title (required)
- `description` - Change description (required)
- `change_type` - Change type (required)
- `priority` - Priority level (required)
- `status: 1` - Open status (required)
- `risk` - Risk level (required)
- `impact` - Impact level (required)

## 8. Maintenance and Updates

### 8.1 Data Retention
- Risk scores and levels are included in change request descriptions
- Assessment data is preserved for compliance and reporting

### 8.2 Review and Updates
- This policy should be reviewed annually
- Any changes to scoring criteria require stakeholder approval
- System updates must maintain backward compatibility with existing assessments

## 9. Appendix

### 9.1 Technical Implementation Reference

The risk calculation is implemented in `app/scripts/app.js` in the `calculateRisk()` function.

### 9.2 Related Documents
- Change Management Process Policy
- Approval Workflow Guidelines  
- Incident Response Procedures

### 9.3 Stakeholder Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| IT Manager | [Name] | [Signature] | [Date] |
| Change Advisory Board Chair | [Name] | [Signature] | [Date] |
| Risk Management | [Name] | [Signature] | [Date] |

---

**Document Control**: This document is version controlled and maintained by the IT Change Management team. For questions or suggested revisions, contact the Change Advisory Board. 