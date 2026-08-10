# Axiomer: User Manual & Tutorial

Welcome to Axiomer! Axiomer is a "Coherence Engine"—a tool for mapping out arguments, tracing them down to their epistemic bedrock, and identifying logical inconsistencies. 

Instead of arguing in circles on social media or in long text documents, Axiomer forces you to structure your thoughts into a **derivation tree**. 

This tutorial will walk you through exactly how to use the application from start to finish.

---

## Step 1: Projects and Branches

When you first open Axiomer, you'll land on the **Workspace Dashboard**. This is a clean list of all your projects.

1. Click **New Project** and name it after the broad topic you want to explore (e.g., "Ethics of AI").
2. Click on the project to expand it. By default, it will have a "main" branch.
3. Axiomer is built like GitHub. If you want to experiment with a different line of reasoning without ruining your main tree, you can create a **New Branch**.
4. Click **Open Editor** on your branch to jump into the canvas.

## Step 2: Laying the Foundation

You are now in the Editor. You'll see a toolbar at the top and a blank canvas (Map View) or Tree View.

1. **Add your first Node.** The root of your argument should be a `Claim` or a `Premise`. 
2. Double-click anywhere on the blank canvas to spawn a new node.
3. The node will be in "editing" mode. Type your core statement. (e.g., *"AI models should be open source."*)
4. Press `Enter` to save it.

> [!TIP]
> If you make a typo, just double-click the node again to edit it inline!

## Step 3: Building the Chain

A single claim isn't an argument. You need to back it up or challenge it.

1. Hover over your new Claim node.
2. A small menu will appear on the right side of the node.
3. Click the **`+` (Add Child)** button.
4. You will see a list of allowed connections. Since this is a Claim, you can add:
   - **Support** (Green): Evidence or logical steps backing it up.
   - **Conflict** (Red): Counter-arguments or logical flaws.
   - **Note** (Gray): Contextual information.

Add a `Support` node. Type: *"Open source accelerates innovation."* Notice how a smooth green line connects the two nodes, showing logical flow.

## Step 4: The Epistemic Bedrock (Grounding)

Axiomer's core philosophy is that arguments must terminate at an undeniable endpoint. You cannot just chain Supports forever. Eventually, you hit a **Terminal Node**.

Terminal Nodes include:
- 💎 **Value:** A subjective moral or ethical preference (e.g., *"Innovation is good for humanity"*).
- 🧱 **Bedrock:** A universally accepted truth (e.g., *"1 + 1 = 2"*).
- 🛑 **Limit:** An epistemic limit (e.g., *"We cannot predict the future"*).
- 🔗 **Source:** An empirical fact backed by a link.

To properly ground your argument:
1. Hover over your Support node.
2. Click the **`+`** button.
3. Select **Value** and type: *"Maximizing human progress is our highest priority."*

Your argument is now **Grounded**. It has been traced from a surface-level claim down to a fundamental human value.

## Step 5: Resolving Conflicts

The true power of Axiomer is visualizing logical inconsistencies.

1. Let's add a **Conflict** to your Root Claim. 
2. Hover over the Root Claim, click `+`, and select **Conflict**. Type: *"Open source models can be used by malicious actors."*
3. Notice how the connecting edge is a **dashed, animated red line**. This instantly draws your eye to the tension in the argument.
4. To resolve this conflict, you must either delete it, or ground the conflict in a stronger Limit or Value that outweighs your original branch. 

## Step 6: Tree View vs Map View

In the top right corner, you can toggle between **Tree View** and **Map View**.

- **Map View (Canvas):** Best for free-flowing exploration. You can drag nodes around, arrange them spatially, and see the web of connections.
- **Tree View (Document):** Best for reading the argument linearly. It structures your graph like a document, making it easy to read from top to bottom.

## Step 7: Exporting and Sharing (The GitHub Workflow)

Once your argument is perfectly coherent and grounded, it's time to share it with the world.

1. Click the **Menu (☰)** icon in the top right.
2. Select **Export Graph**.
3. **Markdown Text:** This generates a clean, readable text version of your tree. You can copy this and paste it directly into a Reddit debate, a GitHub issue, or a Substack post.
4. **Raw JSON:** This exports the actual code of your graph. You can send this file to a friend, they can import it into their Axiomer workspace, create a new branch, and add their own Conflicts to your claims!

---
*Happy mapping! Trace your thoughts, find coherence, and discover your bedrock.*
