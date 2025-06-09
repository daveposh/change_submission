# Change Approval Workflow Guide

## Overview

This document describes the updated change approval workflow implemented in the Freshservice Change Management Application. The workflow uses risk-based routing with automated state transitions to ensure appropriate review and approval levels for different types of changes.

## Workflow States

### 1. Submitted
- **Definition**: Initial state when change request is created
- **Duration**: Momentary - system immediately routes to appropriate next state
- **Actions**: Risk assessment evaluation and stakeholder identification

### 2. Pending Review
- **Definition**: Change requires peer review before approval process can begin
- **Applies to**: Medium Risk (8-11) and High Risk (12-15) changes
- **Duration**: Until peer review coordination task is completed (target: 24 hours)
- **Responsible Party**: Agent SME (Subject Matter Expert)

### 3. Pending Approval  
- **Definition**: Change is awaiting approval from technical owners and/or CAB
- **Applies to**: 
  - Low Risk changes (immediately after submission)
  - Medium/High Risk changes (after peer review completion)
- **Duration**: Until all required approvals are obtained
- **Responsible Party**: Technical owners and/or CAB members

### 4. Scheduled
- **Definition**: All approvals obtained, change ready for implementation
- **Next Step**: Implementation during planned maintenance window
- **Duration**: Until change window opens and implementation begins

## Risk-Based Routing

### Low Risk Changes (Score 5-7)
```
Submitted → Pending Approval → Scheduled
```
- **Initial Status**: "Pending Approval"
- **Process**: Direct routing to technical owner approval
- **Approvers**: Technical owners only
- **Timeline**: 2+ business days lead time

### Medium Risk Changes (Score 8-11)  
```
Submitted → Pending Review → Pending Approval → Scheduled
```
- **Initial Status**: "Pending Review"
- **Process**: Peer review → Workflow automation → Technical owner approval
- **Approvers**: Technical owners (after peer review)
- **Timeline**: 5+ business days lead time

### High Risk Changes (Score 12-15)
```
Submitted → Pending Review → Pending Approval → Scheduled
```
- **Initial Status**: "Pending Review"
- **Process**: Peer review → Workflow automation → Technical owner + CAB approval
- **Approvers**: Technical owners AND Change Advisory Board
- **Timeline**: 10+ business days lead time

## Stakeholder Roles and Responsibilities

### Change Requesters
**During Submission**:
- Complete comprehensive change details
- Accurately assess risk factors
- Associate all impacted assets
- Provide detailed implementation/rollback plans

**After Submission**:
- Monitor change status and respond to questions
- Update change details if issues identified during review
- Coordinate with technical teams for implementation

### Agent SMEs (Subject Matter Experts)
**Triggered When**: Medium/High risk change submitted (Status: "Pending Review")

**Responsibilities**:
1. **Review Change Details**: Understand scope and technical requirements
2. **Coordinate Peer Review**: Choose one option within 24 hours:
   - **Assign to Peer**: Transfer task to qualified technical reviewer
   - **External Review**: Coordinate review outside system and attach evidence
   - **Escalate**: Request management assign appropriate reviewer
3. **Document Results**: Ensure review findings are attached to change
4. **Complete Task**: Mark coordination task complete to trigger workflow automation

**Critical**: Task completion triggers automatic workflow progression

### Peer Reviewers
**Triggered When**: Assigned by SME or management

**Responsibilities**:
1. **Technical Review**: Evaluate implementation approach and risks
2. **Alternative Assessment**: Identify better approaches if available
3. **Risk Validation**: Confirm or challenge risk assessment
4. **Documentation Review**: Verify adequacy of plans and procedures
5. **Recommendation**: Provide clear approval/modification/rejection recommendation
6. **Evidence**: Document review findings for audit trail

### Technical Owners
**Triggered When**: 
- Low risk changes: Immediately after submission
- Medium/High risk changes: After peer review completion (via workflow automation)

**Responsibilities**:
1. **Technical Validation**: Confirm change is technically sound
2. **Resource Verification**: Ensure adequate resources available
3. **Impact Assessment**: Validate impact analysis accuracy
4. **Schedule Review**: Confirm timing is appropriate
5. **Approval Decision**: Provide timely approval/rejection with rationale

### CAB Members (High Risk Only)
**Triggered When**: High risk change completes peer review

**Responsibilities**:
1. **Business Impact Review**: Assess business risk and timing
2. **Resource Coordination**: Ensure cross-team coordination
3. **Compliance Check**: Verify regulatory and policy compliance
4. **Strategic Alignment**: Confirm change aligns with business objectives
5. **Final Authorization**: Provide formal approval for implementation

### Workflow Automator (System)
**Triggered When**: Peer review coordination task marked complete

**Automated Actions**:
1. **Status Update**: Change "Pending Review" to "Pending Approval"
2. **Approval Creation**: Create approval tickets for:
   - Technical owners (all medium/high risk changes)
   - CAB members (high risk changes only)
3. **Notification**: Send approval notifications to designated approvers
4. **Monitoring**: Track approval progress and escalate if overdue

## Detailed Process Flows

### Low Risk Change Process
1. **Submission**: Requester submits change (Risk Score 5-7)
2. **Auto-Routing**: System sets status to "Pending Approval"
3. **Approval Creation**: Technical owner approval tickets created immediately
4. **Stakeholder Notification**: Notifications sent to all impacted parties
5. **Technical Review**: Technical owners review and approve/reject
6. **Completion**: All approvals obtained → Status: "Scheduled"

**Timeline**: Typically 2-5 business days

### Medium Risk Change Process
1. **Submission**: Requester submits change (Risk Score 8-11)
2. **Initial Status**: System sets status to "Pending Review"
3. **SME Assignment**: Peer review coordination task assigned to agent SME
4. **Peer Review Coordination**: SME coordinates peer review (24-hour target)
5. **Workflow Trigger**: Task completion triggers automation
6. **Status Transition**: Automated change to "Pending Approval"
7. **Approval Creation**: Technical owner approval tickets created
8. **Technical Review**: Technical owners review and approve/reject
9. **Completion**: All approvals obtained → Status: "Scheduled"

**Timeline**: Typically 5-10 business days

### High Risk Change Process
1. **Submission**: Requester submits change (Risk Score 12-15)
2. **Initial Status**: System sets status to "Pending Review"
3. **SME Assignment**: Peer review coordination task assigned to agent SME
4. **Peer Review Coordination**: SME coordinates peer review (24-hour target)
5. **Workflow Trigger**: Task completion triggers automation
6. **Status Transition**: Automated change to "Pending Approval"
7. **Approval Creation**: Technical owner AND CAB approval tickets created
8. **Dual Review**: Technical owners and CAB review simultaneously
9. **Completion**: All approvals obtained → Status: "Scheduled"

**Timeline**: Typically 10-15 business days

## Workflow Automation Details

### Trigger Conditions
The Freshservice workflow automator monitors for:
- Peer review coordination task status = "Completed"
- Change status = "Pending Review"
- Task tags include "peer-review-coordination"

### Automated Actions
When triggered, the system automatically:

1. **Updates Change Status**:
   - From: "Pending Review"
   - To: "Pending Approval"

2. **Creates Approval Tickets**:
   - **Medium Risk**: Technical owner approvals only
   - **High Risk**: Technical owner + CAB approvals

3. **Sends Notifications**:
   - Approval request emails to designated approvers
   - Status update to requester and stakeholders

4. **Starts Approval Timer**:
   - Begins tracking approval timeline
   - Sets up escalation triggers for overdue approvals

### Error Handling
If automation fails:
- Manual intervention triggers alert to change management team
- Backup process creates approvals manually
- Audit log records any manual interventions

## Notification Schedule

### For Change Requesters
- **Immediate**: Submission confirmation with status and next steps
- **Status Changes**: Automated notifications when status updates
- **Issues**: Immediate notification if review identifies problems
- **Completion**: Final notification when change moves to "Scheduled"

### For Agent SMEs
- **Immediate**: Task assignment for peer review coordination
- **Reminders**: 12-hour and 20-hour reminders if task incomplete
- **Escalation**: 24-hour automatic escalation if task overdue

### For Peer Reviewers
- **Assignment**: Notification when task reassigned to them
- **Deadline**: Reminder of review completion deadline
- **Resources**: Access to all change documentation and contact info

### For Technical Owners
- **Low Risk**: Immediate notification after submission
- **Medium/High Risk**: Notification after peer review completion
- **Reminders**: Regular reminders until approval provided
- **Escalation**: Management notification if approval overdue

### For CAB Members
- **High Risk Only**: Notification after peer review completion
- **Meeting Schedule**: Integration with CAB meeting calendar
- **Documentation**: Complete change package for review

### For Stakeholders
- **Information Only**: Initial notification of upcoming change
- **No Action Required**: Clear statement that no approval needed
- **Updates**: Major status changes and final implementation notice

## Escalation Procedures

### Peer Review Delays
- **24 Hours**: Automatic escalation to department manager
- **48 Hours**: Escalation to IT management
- **72 Hours**: Executive review and manual assignment

### Approval Delays
- **5 Business Days**: Reminder to approvers and requester
- **10 Business Days**: Manager escalation
- **15 Business Days**: Executive escalation and expedited review

### Process Issues
- **Technical Problems**: IT operations team immediate notification
- **Policy Disputes**: Change management office review
- **Resource Conflicts**: Department manager coordination

## Monitoring and Metrics

### Key Performance Indicators
- **Peer Review Cycle Time**: Target <24 hours
- **Approval Cycle Time**: Target <5 business days
- **Overall Process Time**: Varies by risk level
- **Automation Success Rate**: Target >95%

### Reporting
- **Daily**: Active change status dashboard
- **Weekly**: Cycle time and bottleneck analysis
- **Monthly**: Process efficiency and trend reporting
- **Quarterly**: Stakeholder satisfaction and process improvement

## Best Practices

### For Efficient Processing
1. **Accurate Risk Assessment**: Prevents inappropriate routing
2. **Complete Documentation**: Reduces review delays
3. **Early Stakeholder Engagement**: Minimizes approval delays
4. **Realistic Scheduling**: Allows adequate review time

### For Quality Outcomes
1. **Thorough Peer Review**: Identifies issues before approval
2. **Comprehensive Testing**: Reduces implementation risk
3. **Clear Communication**: Keeps all parties informed
4. **Documentation Standards**: Ensures audit compliance

### For Continuous Improvement
1. **Feedback Collection**: Regular stakeholder feedback
2. **Process Metrics**: Data-driven improvement identification
3. **Training Updates**: Keep stakeholders current on process
4. **Tool Enhancement**: Regular application updates and improvements

## Troubleshooting Common Issues

### Change Stuck in "Pending Review"
**Cause**: Peer review coordination task not completed
**Solution**: 
- Check task assignment and status
- Contact assigned SME for status update
- Escalate to management if overdue

### Change Stuck in "Pending Approval"
**Cause**: Outstanding approvals not completed
**Solution**:
- Identify pending approvers
- Send reminder notifications
- Escalate through management chain

### Workflow Automation Not Triggering
**Cause**: Technical issue with automation rules
**Solution**:
- Manual approval creation
- IT operations notification for troubleshooting
- Process improvement team review

### Incorrect Risk Assessment
**Cause**: Initial assessment was inaccurate
**Solution**:
- Update risk assessment
- Re-route through appropriate process
- Document lessons learned

This workflow ensures appropriate oversight while maintaining efficiency through automation and clear stakeholder responsibilities. 