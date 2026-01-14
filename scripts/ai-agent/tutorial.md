# Building a Functional Coding Agent from Scratch

Today AI coding assistants feel like magic. You describe what you want in sometimes barely coherent English, and they read files, edit your project, and write functional code.

But here’s the thing: the core of these tools isn’t magic. It’s about 200 lines of straightforward Python.

Let’s build a functional coding agent from scratch.

## The Mental Model
Before we write any code, let’s understand what’s actually happening when you use a coding agent. It’s essentially just a conversation with a powerful LLM that has a toolbox.

1. You send a message (“Create a new file with a hello world function”)
2. The LLM decides it needs a tool and responds with a structured tool call (or multiple tool calls)
3. Your program executes that tool call locally (actually creates the file)
4. The result gets sent back to the LLM
5. The LLM uses that context to continue or respond

That’s the whole loop. The LLM never actually touches your filesystem. It just asks for things to happen, and your code makes them happen.

## Three Tools You Need
Our coding agent fundamentally needs three capabilities:

1. **Read files** so the LLM can see your code
2. **List files** so it can navigate your project
3. **Edit files** so it can give the directive to create and modify code

That’s it. Production agents like Claude Code have a few more capabilities including grep, bash, websearch, etc but for our purposes we’ll see that three tools is sufficient to do incredible things.

## Implementation Details
The implementation uses a standard loop where the LLM can call tools sequentially. The tool registry maps tool names to Python functions, and the system prompt explains how to format tool calls.

For the full code implementation, see [agent.py](./agent.py).
