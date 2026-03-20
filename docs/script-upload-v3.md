# Script Upload V3: Implementation Guide

This guide provides the technical details for implementing the Script Upload V3 workflow, including API specifications, sequence diagrams, and polling strategies.

## Overview of the Workflow

The workflow differs significantly depending on whether the file is a native **Final Draft (.fdx)** or a document format that requires **AI Conversion** (PDF, DOCX, TXT).

---

## 1. Initial Upload

All uploads start with the same endpoint.

- **Endpoint**: `POST /api/creative_hub/scripts/upload/v3/?project_id={projectId}`
- **Content-Type**: `multipart/form-data`
- **Payload**:
  - `file`: The script file (File object)

### Response Cases

#### A. Final Draft (.fdx) - Synchronous
The backend parses the FDX immediately and populates scenes.
```json
{
  "id": 124,
  "title": "My Script.fdx",
  "requires_confirmation": false,
  "scenes_created": 15,
  "source": "fdx_parser_v3",
  "message": "FDX parsed and scenes generated successfully."
}
```
**Frontend Action**: Immediately redirect to the Script Editor or reload the list.

#### B. Non-FDX (PDF, etc.) - Asynchronous
The backend initiates a conversion task and returns a `task_id`.
```json
{
  "id": 123,
  "title": "My Script.pdf",
  "task_id": "abc-123-uuid",
  "requires_confirmation": true,
  "review_status": "processing",
  "message": "Conversion started. Review draft when processing completes."
}
```
**Frontend Action**: Switch to a loading/processing state and begin polling the Task Status API.

---

## 2. Polling for Completion

Use the `task_id` from the upload response to monitor progress.

- **Endpoint**: `GET /api/project/v2/taskstatus/?task_id={taskId}`

### Response States

| State | Response Body Snippet | UI Action |
| :--- | :--- | :--- |
| **Processing** | `{"status": "pending"}` or `{"status": "started"}` | Continue polling (3-5s intervals). |
| **Failure** | `{"status": "failure", "error": "Reason..."}` | Show error and stop polling. |
| **Success** | `{"status": "success", "result": {...}}` | Proceed to **Step 3: Fetch Review**. |

**Success Response Example**:
```json
{
  "status": "success",
  "result": {
    "script_id": 123,
    "status": "ready_for_review",
    "scene_count": 10
  }
}
```

---

## 3. Fetching the Review Draft

Once the task is successful, fetch the generated draft for user approval.

- **Endpoint**: `GET /api/creative_hub/scripts/{scriptId}/conversion/review/`

### Response
```json
{
  "script_id": 123,
  "title": "My Script",
  "draft": {
    "status": "ready_for_review",
    "scenes": [
      { "order": 1, "title": "EXT. FOREST - DAY", "description": "...", "location": "Forest" },
      ...
    ],
    "fdx_preview": "<?xml version=\"1.0\" ... ?>",
    "scene_count": 10
  }
}
```
**Frontend Action**: Display the scenes to the user. You can use the `fdx_preview` to show a text preview or the `scenes` array to show a structured list.

---

## 4. Final Confirmation

After the user approves or edits the draft, send a confirmation to finalize the script.

- **Endpoint**: `POST /api/creative_hub/scripts/{scriptId}/conversion/confirm/`
- **Payload**:
  ```json
  {
    "action": "confirm",
    "scenes": null,         // Optional: Send edited scenes if user modified them
    "screenplay_text": ""   // Optional: Send raw text if user wants re-conversion
  }
  ```

### Response
```json
{
  "status": "confirmed",
  "script_id": 123,
  "scenes_created": 10
}
```
**Frontend Action**: Confirmation is complete. Deletion of existing scenes (if any) and final population of all project data is handled by the backend. Redirect to the Script Editor.

---

## API Sequence Summary

1. `POST /upload/v3/` $\to$ Returns `task_id`
2. Loop: `GET /v2/taskstatus/?task_id={id}` $\to$ Until `status: "success"`
3. `GET /conversion/review/` $\to$ Returns draft scenes
4. `POST /conversion/confirm/` $\to$ Finalizes scene generation
