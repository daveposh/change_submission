# Peer Review Task Implementation

## Overview

The Freshworks FDK Change Management Application now automatically creates peer review coordination tasks for change requests with risk scores of 7 or higher (Medium and High risk changes). The task is assigned to an agent SME (Subject Matter Expert) who is responsible for coordinating the peer review process.

## Risk Threshold Logic

### Risk Score Calculation
- **Total Risk Score**: Sum of 5 criteria, each scored 1-3 points (range: 5-15)
- **Risk Levels**:
  - **Low Risk**: 5-7 points
  - **Medium Risk**: 8-11 points  
  - **High Risk**: 12-15 points

### Peer Review Trigger
- **Threshold**: Risk score ≥ 7
- **Applies to**: Medium Risk (8-11) and High Risk (12-15) changes
- **Rationale**: Low risk changes (5-7) use standard approval processes

## Implementation Details

### SME Coordination Approach
When a change request is submitted with risk score ≥ 7:

1. **SME Identification**: System automatically identifies an agent SME from:
   - **Primary**: Assigned agent (if different from requester)
   - **Fallback**: Primary technical owner from impacted services analysis
   - **Last Resort**: Asset manager from selected assets

2. **Single Task Creation**: Creates one peer review coordination task assigned to the identified SME

3. **SME Responsibilities**: The SME must choose one of three options:
   - **Peer Assignment**: Reassign the task to a qualified technical peer (different from requester and SME)
   - **External Coordination**: Obtain peer review through other means and attach evidence
   - **Escalation**: Escalate for appropriate reviewer assignment

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

#### For Risk Score ≥ 7 (with SME identified):
```
✅ Change Request Submitted Successfully!
Change Request ID: CR-12345
Title: Database Schema Update
Risk Level: MEDIUM (Score: 9/15)

🎯 Peer Review Coordination Required
Due to the Medium risk level, a peer review coordination task has been assigned 
to the agent SME. They are responsible for obtaining peer review within 24 hours 
by assigning to a qualified peer reviewer, coordinating external review, or escalating for assignment.
```

#### For Risk Score ≥ 7 (no SME identified):
```
⚠️ Peer Review Required
Due to the Medium risk level, peer review is required but no agent SME could be 
automatically identified. Please manually assign a Subject Matter Expert to 
coordinate the peer review process.
```

#### For Risk Score < 7:
```
ℹ️ No peer review required for Low risk changes.
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
   const requiresPeerReview = riskAssessment.totalScore >= 8; // Modify this value
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