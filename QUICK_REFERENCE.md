# Change Management Quick Reference Guide

## Process Overview
**Change Request → Asset Association → Risk Assessment → Planning → Scheduling → Review → Submit → [Risk-Based Routing] → Approval → Implementation**

## Change Approval Workflow States

### Status Flow Overview
```
All Changes: Submitted → Pending Review → Pending Approval → Scheduled
```

### State Definitions
- **Pending Review**: Requires peer review coordination (All risk levels)
- **Pending Approval**: Awaiting technical owner/CAB approval  
- **Scheduled**: All approvals obtained, ready for implementation

### Risk-Based Routing
- **Low Risk (5-7)**: Peer review → Technical owners
- **Medium Risk (8-11)**: Peer review → Technical owners
- **High Risk (12-15)**: Peer review → Technical owners + CAB

### Key Automation
- Freshservice workflow automator monitors peer review task completion
- Automatically transitions from "Pending Review" to "Pending Approval"
- Creates appropriate approval tickets based on risk level

## Risk Assessment Scale (1-3 each factor)
| Factor | 1 (Low) | 2 (Medium) | 3 (High) |
|--------|---------|------------|-----------|
| **Business Impact** | Isolated system | Department impact | Multiple depts/customers |
| **Affected Users** | <10 users | 10-100 users | >100 users |
| **Complexity** | Simple/routine | Standard procedure | Complex/multi-system |
| **Testing Level** | Comprehensive | Limited testing | Minimal testing |
| **Rollback Risk** | Easy/automated | Moderate difficulty | Difficult/data loss risk |

## Risk Levels & Requirements
- **Low Risk (5-7)**: Status "Pending Review" → Peer review → Technical owner approval, 2 days lead time
- **Medium Risk (8-11)**: Status "Pending Review" → Peer review → Technical owner approval, 5 days lead time  
- **High Risk (12-15)**: Status "Pending Review" → Peer review → Technical owner + CAB approval, 10 days lead time

## Required Documentation
- **Implementation Plan**: Step-by-step execution procedure
- **Validation Plan**: Success criteria and testing procedures
- **Backout Plan**: Rollback procedure and triggers

## Key Roles
- **Requester**: Owns change, provides business justification
- **Assigned Agent**: Technical coordinator, manages peer review
- **Technical Owner**: Approves changes to owned assets
- **Stakeholders**: Receive notifications, provide feedback
- **Peer Reviewers**: Independent technical validation (medium/high risk)
- **CAB**: Governance oversight for high-risk changes

## Automated Actions Upon Submission
1. ✅ Change request created in Freshservice
2. ✅ Assets associated with change  
3. ✅ Stakeholder notifications sent
4. ✅ Risk-based status assignment:
   - **Low Risk**: Status "Pending Approval" + Technical owner approval tickets
   - **Medium/High Risk**: Status "Pending Review" + Peer review coordination task
5. ✅ Workflow automation triggers upon peer review completion
6. ✅ Additional approver fields populated

## Emergency Changes
- Can be implemented with post-approval
- Mandatory post-implementation review within 48 hours
- All emergency changes reviewed at next CAB meeting

## Contact Information
- **Help Desk**: it-helpdesk@company.com | (555) 123-4567
- **Change Manager**: John Smith (john.smith@company.com)
- **CAB Chair**: Jane Doe (jane.doe@company.com)

## Common Issues & Quick Fixes
- **Validation Errors**: Check all required fields, risk assessment completion
- **Asset Association Problems**: Clear browser cache, verify asset exists
- **Missing Notifications**: Check email addresses, spam filters
- **App Not Loading**: Clear cache, try different browser

---
*For complete documentation, see USER_GUIDE.md* 