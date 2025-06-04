# Peer Review Task Implementation

## Overview

The Freshworks FDK Change Management Application now automatically creates peer review tasks for change requests with risk scores of 7 or higher (Medium and High risk changes).

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

### Automatic Task Creation
When a change request is submitted with risk score ≥ 7:

1. **Reviewer Identification**: System automatically identifies peer reviewers from:
   - Assigned agent (if different from requester)
   - Technical owners from impacted services analysis
   - Asset managers/owners from selected assets

2. **Task Creation**: Creates individual peer review tasks for each identified reviewer

3. **Task Properties**:
   - **Subject**: "Peer Review Required: [Change Title]"
   - **Priority**: Medium (High for High-risk changes)
   - **Due Date**: 24 hours from creation
   - **Type**: Incident/Task
   - **Tags**: `peer-review`, `change-management`, `change-[ID]`

### Task Content

Each peer review task includes:

#### Change Details Section
- Change Request ID and title
- Requester information
- Risk level badge with score
- Planned implementation dates

#### Technical Information
- Implementation plan details
- Validation plan (if provided)
- Risk assessment breakdown

#### Review Checklist
Reviewers are asked to evaluate:
- **Technical Feasibility**: Can this change be implemented as described?
- **Risk Assessment**: Are there additional risks not considered?
- **Alternative Approaches**: Better or safer implementation methods?
- **Testing Strategy**: Adequacy of testing for the risk level
- **Rollback Plan**: Sufficiency of rollback procedures

#### Instructions
- 24-hour completion deadline
- Coordination requirements with change requester
- Task update requirements

## User Experience

### Submission Feedback
After successful change submission, users see:

#### For Risk Score ≥ 7 (with reviewers identified):
```
✅ Change Request Submitted Successfully!
Change Request ID: CR-12345
Title: Database Schema Update
Risk Level: MEDIUM (Score: 9/15)

👥 Peer Review Required
Due to the Medium risk level, 2 peer review task(s) have been created 
and assigned to technical reviewers. They have 24 hours to complete their review.
```

#### For Risk Score ≥ 7 (no reviewers identified):
```
⚠️ Peer Review Required
Due to the Medium risk level, peer review is required but no reviewers 
could be automatically identified. Please manually assign peer reviewers.
```

#### For Risk Score < 7:
```
ℹ️ No peer review required for Low risk changes.
```

## Technical Implementation

### FDK Request Method
Uses the standard Freshworks FDK request template pattern:

```javascript
// Template: createTask (already configured in config/requests.json)
const response = await window.client.request.invokeTemplate('createTask', {
  body: JSON.stringify(taskData)
});
```

### Error Handling
- Individual task creation failures don't stop the overall submission
- Detailed logging for troubleshooting
- Graceful degradation when no reviewers are identified

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
   const requiresPeerReview = riskAssessment.totalScore >= 7; // Modify this value
   ```

2. **Due Date**: Modify the 24-hour deadline:
   ```javascript
   dueDate.setHours(dueDate.getHours() + 24); // Change hours value
   ```

3. **Task Priority**: Adjust priority logic in `createPeerReviewTask()`:
   ```javascript
   let taskPriority = 2; // Medium priority default
   if (riskAssessment.riskLevel === 'High') {
     taskPriority = 3; // High priority for high-risk changes
   }
   ```

## Monitoring and Reporting

### Logging
Comprehensive logging includes:
- Risk assessment data analysis
- Threshold evaluation reasoning
- Reviewer identification process
- Task creation success/failure
- Final task count summary

### State Tracking
Created tasks are tracked in the submission module state:
```javascript
this.state.createdTasks.push(task);
```

## Future Enhancements

Potential improvements:
1. **Custom Fields**: Link tasks to change requests via custom fields
2. **Escalation**: Automatic escalation for overdue reviews
3. **Templates**: Configurable task templates per risk level
4. **Notifications**: Email notifications to reviewers
5. **Dashboard**: Peer review workload dashboard
6. **Metrics**: Review completion time analytics

## Compliance

This implementation supports:
- **Change Advisory Board (CAB) processes**
- **Risk-based approval workflows**
- **Audit trail requirements**
- **Segregation of duties**
- **Technical review standards** 