# Peer Review Task Implementation

## Overview

The Freshworks FDK Change Management Application implements a risk-based approval workflow with automated state transitions. **All changes, regardless of risk level (Low, Medium, High), require peer review coordination before moving to the approval phase.** Upon peer review completion, the Freshservice workflow automator automatically transitions the change to "Pending Approval" status and releases approval tickets to technical owners and/or CAB members as appropriate.

## Risk Threshold Logic

### Risk Score Calculation
- **Total Risk Score**: Sum of 5 criteria, each scored 1-3 points (range: 5-15)
- **Risk Levels**:
  - **Low Risk**: 5-7 points
  - **Medium Risk**: 8-11 points  
  - **High Risk**: 12-15 points

### Status Assignment
- **All Risk Levels (5-15)**: Initial status "Pending Review" - peer review required first
- **Rationale**: Risk-based routing ensures appropriate review level for change complexity

## Implementation Details

### Risk-Based Workflow Process
When a change request is submitted:

**Low Risk Changes (Score 5-7):**
1. **Status Assignment**: "Pending Review"
2. **Peer Review**: Peer review coordination task assigned to agent SME
3. **Upon completion**: Technical owner approval tickets created automatically
4. **Workflow**: Standard approval process begins after peer review

**Medium Risk Changes (Score 8-11):**
1. **Status Assignment**: "Pending Review"
2. **Peer Review**: Peer review coordination task assigned to agent SME
3. **Upon completion**: Technical owner approval tickets created automatically
4. **Workflow**: Standard approval process begins after peer review

**High Risk Changes (Score 12-15):**
1. **Status Assignment**: "Pending Review"
2. **Peer Review**: Peer review coordination task assigned to agent SME
3. **Upon completion**: Technical owner approval tickets and CAB approval tickets created
4. **Workflow**: Approval process begins after peer review

### Workflow Automation Trigger
When the peer review coordination task is marked complete:
1. **Automatic Detection**: Freshservice workflow automator monitors task completion
2. **Status Transition**: Change status automatically updates from "Pending Review" to "Pending Approval"
3. **Approval Release**: System creates approval tickets for:
   - Technical owners (for all changes)
   - CAB members (for high risk changes only)
4. **Final Approval**: When all approvals obtained, status changes to "Scheduled"

### Task Properties
- **Subject**: "Peer Review Coordination Required: [Change Title]"
- **Assigned To**: Agent SME (not individual peer reviewers)
- **Priority**: Medium (High for High-risk changes)
- **Due Date**: 24 hours from creation
- **Type**: Incident/Task
- **Tags**: `peer-review-coordination`, `change-management`, `change-[ID]`, `sme-task`

### Task Content

Each peer review coordination task includes:

#### SME Assignment Section
- Clear identification of assigned SME and their source (Assigned Agent, Technical Owner, etc.)
- Explanation of SME responsibility for coordinating peer review

#### Change Details Section
- Change Request ID and title
- Requester information
- Risk level badge with score
- Planned implementation dates

#### Technical Information
- Implementation plan details
- Validation plan (if provided)
- Risk assessment breakdown

#### SME Responsibilities
Clear instructions for the SME with coordination options:
1. **Assign to Peer Reviewer**: Transfer task to qualified reviewer (must be independent)
2. **Coordinate External Review**: Obtain review externally and attach evidence
3. **Escalate for Assignment**: Request management assign appropriate peer reviewer

#### Review Checklist
Standard evaluation criteria for the peer review:
- **Technical Feasibility**: Implementation viability
- **Risk Assessment**: Additional risks identification
- **Alternative Approaches**: Better implementation methods
- **Testing Strategy**: Adequacy for risk level
- **Rollback Plan**: Sufficiency of procedures
- **Implementation Timeline**: Realistic scheduling

#### Completion Instructions
- 24-hour deadline for coordination
- Required evidence attachment
- Task update requirements
- Coordination with requester if issues found

## User Experience

### Submission Feedback
After successful change submission, users see:

#### For Low/Medium Risk Changes (Score 5-11):
```
✅ Change Request Submitted Successfully!
Change Request ID: CR-12345
Title: Database Schema Update
Risk Level: LOW or MEDIUM (Score: X/15)
Status: PENDING REVIEW

🎯 Peer Review Required
A peer review coordination task has been assigned to the agent SME. 
Upon completion of peer review, the Freshservice workflow automator will:
- Change status to "Pending Approval"
- Create approval tickets for technical owners
- Change will move to "Scheduled" status once approved
```

#### For High Risk Changes (Score 12-15):
```
✅ Change Request Submitted Successfully!
Change Request ID: CR-12345
Title: Database Schema Update
Risk Level: HIGH (Score: X/15)
Status: PENDING REVIEW

🏛️ Peer Review + CAB Required
A peer review coordination task has been assigned to the agent SME.
Upon completion of peer review, the Freshservice workflow automator will:
- Change status to "Pending Approval"
- Create approval tickets for technical owners AND CAB
- Change will move to "Scheduled" status once all approvals obtained
```

#### For Any Risk (no SME identified):
```
⚠️ Peer Review Required
Peer review is required but no agent SME could be 
automatically identified. Please manually assign a Subject Matter Expert to 
coordinate the peer review process. Change status: PENDING REVIEW
```

## Technical Implementation

### SME Identification Logic
The system identifies the agent SME using this priority order:

1. **Assigned Agent** (Primary choice)
   - Must be different from the change requester
   - Has direct responsibility for the change

2. **Primary Technical Owner** (Fallback)
   - First approver from impacted services analysis
   - Technical expertise for affected systems

3. **Asset Manager** (Last resort)
   - Manager of the first selected asset
   - Domain knowledge of affected infrastructure

### FDK Request Method
Uses the standard Freshworks FDK request template pattern:

```javascript
// Template: createTask (already configured in config/requests.json)
const response = await window.client.request.invokeTemplate('createTask', {
  body: JSON.stringify(taskData)
});
```

### Error Handling
- Graceful degradation when no SME is identified
- Detailed logging for troubleshooting
- Single point of failure vs. multiple task creation

### Integration Points
- **Risk Assessment Module**: Reads risk scores and levels
- **Impacted Services Analysis**: Identifies technical owners
- **Asset Association**: Identifies asset managers
- **Change Submission Workflow**: Integrated as Step 6

## Configuration

### Request Template
The `createTask` template is already configured in:
- `config/requests.json`: API endpoint definition
- `manifest.json`: Template declaration

### Customization Options
To modify peer review behavior:

1. **Risk Threshold**: Change the threshold in `createPeerReviewTasks()`:
   ```javascript
   const requiresPeerReview = ['Low', 'Medium', 'High'].includes(riskAssessment.riskLevel); // Peer review for all risk levels
   ```

2. **Due Date**: Modify the 24-hour deadline:
   ```javascript
   dueDate.setHours(dueDate.getHours() + 24); // Change hours value
   ```

3. **Task Priority**: Adjust priority logic in `createPeerReviewCoordinationTask()`:
   ```javascript
   let taskPriority = 2; // Medium priority default
   if (riskAssessment.riskLevel === 'High') {
     taskPriority = 3; // High priority for high-risk changes
   }
   ```

4. **SME Selection**: Modify the priority order in `identifyAgentSME()`:
   ```javascript
   // Adjust the order: Assigned Agent → Technical Owner → Asset Manager
   ```

## Monitoring and Reporting

### Logging
Comprehensive logging includes:
- Risk assessment data analysis
- Threshold evaluation reasoning
- SME identification process
- Task creation success/failure
- SME source tracking (Assigned Agent, Technical Owner, Asset Manager)

### State Tracking
Created coordination tasks are tracked in the submission module state:
```javascript
this.state.createdTasks.push(task);
```

## Advantages of SME Coordination Approach

### Benefits
1. **Single Point of Responsibility**: One SME coordinates the entire process
2. **Flexibility**: SME can choose the most appropriate review method
3. **Expertise Matching**: SME can select the best-qualified peer reviewer
4. **Reduced Task Overhead**: One task instead of multiple reviewer tasks
5. **Clear Accountability**: SME is responsible for ensuring review completion

### SME Options
1. **Peer Assignment**: SME reassigns to most qualified technical peer (independent reviewer)
2. **External Coordination**: SME obtains review through other channels
3. **Escalation**: SME escalates for appropriate reviewer assignment when uncertain

## Future Enhancements

Potential improvements:
1. **SME Pool Management**: Configurable SME assignment rules
2. **Escalation Workflows**: Automatic escalation for overdue coordination
3. **Review Templates**: Standardized review forms and checklists
4. **Peer Reviewer Directory**: Searchable database of qualified reviewers
5. **Review Metrics**: Track coordination effectiveness and completion times
6. **Integration**: Link with external review tools and systems

## Compliance

This implementation supports:
- **Change Advisory Board (CAB) processes**
- **Risk-based approval workflows**
- **Audit trail requirements**
- **Segregation of duties**
- **Technical review standards**
- **SME accountability frameworks** 