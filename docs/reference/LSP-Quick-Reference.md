# LSP Quick Reference Guide

## Message Flow Cheat Sheet

### 🚀 Initialization Phase
```
Client → Server: initialize
Server → Client: initialize response (capabilities)
Client → Server: initialized (notification)
Server → Client: client/registerCapability (optional)
Server → Client: workspace/configuration (optional)
```

### 📄 Document Operations
```
Client → Server: textDocument/didOpen (notification)
Server → Client: textDocument/publishDiagnostics (notification)
Client → Server: textDocument/* requests
Server → Client: corresponding responses
```

### 🔚 Shutdown Phase
```
Client → Server: shutdown request
Server → Client: shutdown response
Client → Server: exit (notification)
```

## Common Request/Response Patterns

### Document Symbols
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/documentSymbol",
  "params": {
    "textDocument": { "uri": "file:///path/to/file.cs" }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "name": "ClassName",
      "kind": 5,
      "range": { "start": {"line": 0, "character": 0}, "end": {"line": 10, "character": 0} },
      "selectionRange": { "start": {"line": 0, "character": 13}, "end": {"line": 0, "character": 22} }
    }
  ]
}
```

### Hover Information
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "textDocument/hover",
  "params": {
    "textDocument": { "uri": "file:///path/to/file.cs" },
    "position": { "line": 5, "character": 10 }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "contents": {
      "kind": "markdown",
      "value": "```csharp\nClassName\n```"
    }
  }
}
```

### Code Completion
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "textDocument/completion",
  "params": {
    "textDocument": { "uri": "file:///path/to/file.cs" },
    "position": { "line": 10, "character": 15 }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "isIncomplete": false,
    "items": [
      {
        "label": "methodName",
        "kind": 2,
        "detail": "void methodName()",
        "insertText": "methodName()"
      }
    ]
  }
}
```

## Symbol Kinds Reference

| Kind | Value | Description |
|------|-------|-------------|
| File | 1 | File symbol |
| Module | 2 | Module/namespace |
| Namespace | 3 | Namespace |
| Package | 4 | Package |
| Class | 5 | Class |
| Method | 6 | Method/function |
| Property | 7 | Property |
| Field | 8 | Field/variable |
| Constructor | 9 | Constructor |
| Enum | 10 | Enumeration |
| Interface | 11 | Interface |
| Function | 12 | Function |
| Variable | 13 | Variable |
| Constant | 14 | Constant |
| String | 15 | String |
| Number | 16 | Number |
| Boolean | 17 | Boolean |
| Array | 18 | Array |

## Completion Item Kinds

| Kind | Value | Description |
|------|-------|-------------|
| Text | 1 | Plain text |
| Method | 2 | Method |
| Function | 3 | Function |
| Constructor | 4 | Constructor |
| Field | 5 | Field |
| Variable | 6 | Variable |
| Class | 7 | Class |
| Interface | 8 | Interface |
| Module | 9 | Module |
| Property | 10 | Property |
| Unit | 11 | Unit |
| Value | 12 | Value |
| Enum | 13 | Enumeration |
| Keyword | 14 | Keyword |
| Snippet | 15 | Snippet |
| Color | 16 | Color |
| File | 17 | File |
| Reference | 18 | Reference |

## Diagnostic Severity Levels

| Level | Value | Description |
|-------|-------|-------------|
| Error | 1 | Compilation error |
| Warning | 2 | Warning |
| Information | 3 | Informational message |
| Hint | 4 | Hint/suggestion |

## Error Codes

| Code | Description |
|------|-------------|
| -32700 | Parse error |
| -32600 | Invalid Request |
| -32601 | Method not found |
| -32602 | Invalid params |
| -32603 | Internal error |
| -32002 | ServerNotInitialized |
| -32001 | UnknownErrorCode |
| -32800 | RequestCancelled |

## Client Implementation Checklist

### ✅ Required Client Capabilities
- [ ] Handle `initialize` request/response
- [ ] Send `initialized` notification
- [ ] Handle `shutdown` request/response  
- [ ] Send `exit` notification
- [ ] Process `textDocument/publishDiagnostics`

### ✅ Optional but Recommended
- [ ] Respond to `client/registerCapability`
- [ ] Respond to `workspace/configuration`
- [ ] Handle `window/workDoneProgress/create`
- [ ] Process `$/progress` notifications
- [ ] Handle `window/logMessage` notifications

### ✅ Document Operations
- [ ] Send `textDocument/didOpen`
- [ ] Send `textDocument/didChange`
- [ ] Send `textDocument/didSave`
- [ ] Send `textDocument/didClose`

### ✅ Language Features
- [ ] `textDocument/documentSymbol`
- [ ] `textDocument/hover`
- [ ] `textDocument/completion`
- [ ] `textDocument/definition`
- [ ] `textDocument/references`
- [ ] `textDocument/formatting`
- [ ] `textDocument/signatureHelp`

## Common Pitfalls

### ❌ Don't Do This
```javascript
// Missing Content-Length header
process.stdout.write(JSON.stringify(message));

// Incorrect shutdown sequence
client.sendNotification('exit'); // Missing shutdown request

// Ignoring server requests
// Not responding to client/registerCapability
```

### ✅ Do This
```javascript
// Proper message formatting
const body = JSON.stringify(message);
const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
process.stdout.write(header + body);

// Proper shutdown sequence
await client.sendRequest('shutdown', null);
client.sendNotification('exit', null);

// Handle server requests
if (message.method === 'client/registerCapability') {
  return { jsonrpc: '2.0', id: message.id, result: null };
}
```

## Performance Tips

1. **Use Progressive Results**: Set `isIncomplete: true` for large completion lists
2. **Implement Cancellation**: Support request cancellation for long operations
3. **Batch Operations**: Group related requests when possible
4. **Cache Results**: Cache expensive computations (symbols, completions)
5. **Incremental Sync**: Use incremental document synchronization for large files

## Testing Your Implementation

### Basic Connectivity Test
```javascript
// 1. Can you establish connection?
// 2. Does initialize/initialized work?
// 3. Can you send shutdown/exit?
```

### Feature Test Matrix
```
Document Operations:
[ ] Open document
[ ] Change document  
[ ] Save document
[ ] Close document

Language Features:
[ ] Document symbols
[ ] Hover information
[ ] Go to definition
[ ] Find references
[ ] Code completion
[ ] Document formatting
[ ] Signature help

Error Handling:
[ ] Invalid requests
[ ] Server errors
[ ] Connection loss
[ ] Timeout handling
```

## Debug Tips

1. **Log All Messages**: Save full request/response logs
2. **Check Headers**: Verify Content-Length accuracy
3. **Validate JSON**: Ensure proper JSON-RPC 2.0 format
4. **Monitor Process**: Check server process status
5. **Test Edge Cases**: Empty files, large files, invalid positions

## Useful Resources

- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
- [VS Code LSP Guide](https://code.visualstudio.com/api/language-extensions/language-server-extension-guide)