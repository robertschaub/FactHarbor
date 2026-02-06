# Tech Writer Onboarding - Documentation Consolidation Project

## Welcome Message (Send this to start)

---

**Subject:** FactHarbor Documentation Consolidation - Getting Started

Hi [Tech Writer Name],

Welcome to the FactHarbor documentation consolidation project! This is a one-time effort to organize all our project documentation into a single, well-structured system.

**Project Goal:** Consolidate scattered documentation into xWiki (our master documentation system) with synchronized local Markdown files for version control.

**Your Total Involvement:** Estimated 14-27 hours spread over [timeline: 2-3 weeks suggested]

---

## 📚 Phase 0: Preparation & Knowledge Building (Before You Start)

**Before our kickoff call, please complete these steps:**

### Step 1: Read the Project Documents (2-3 hours)

I've prepared three documents that explain everything:

1. **[INSTRUCTIONS_FOR_TECH_WRITER.md](INSTRUCTIONS_FOR_TECH_WRITER.md)** - Your complete work plan
   - Read this FIRST - it's your main guide
   - Understand the 6 tasks you'll complete
   - Review the proposed xWiki structure
   - Familiarize with the deliverables

2. **[ROLES_AND_RESPONSIBILITIES.md](ROLES_AND_RESPONSIBILITIES.md)** - Who does what
   - Understand what you own vs what I review
   - Note the checkpoint schedule
   - See the do's and don'ts

3. **[xwiki-export/WORKFLOW.md](xwiki-export/WORKFLOW.md)** - Conversion tools reference
   - Skim this - you'll use it during the work
   - Understand the XAR ↔ Markdown workflow
   - Bookmark for later reference

### Step 2: Explore the Current State (1-2 hours)

**Access you'll need from me:**
- [ ] xWiki access (I'll send login)
- [ ] Git repository access (I'll send invite)
- [ ] Any other credentials

**Once you have access, explore:**

1. **Browse xWiki** (30 min)
   - URL: [I'll provide]
   - Login and click around
   - Notice the current organization (or lack thereof)
   - Don't make any changes yet - just look

2. **Browse the Git Repo** (30 min)
   - Clone: `git clone [repo URL]`
   - Explore `Docs/` directory
   - Notice `Docs/WIP/`, `Docs/ARCHIVE/`, `Docs/STATUS/`
   - Check what's in `Docs/xwiki-export/`

3. **List what you find** (30 min)
   - Create a rough list of content locations
   - Note your first impressions
   - Write down questions

### Step 3: Test the Conversion Tools (1 hour)

**Goal:** Verify the tools work on your machine before starting real work.

1. **Ensure Python is installed**
   ```bash
   python --version  # Should be 3.8 or higher
   ```

2. **Navigate to conversion scripts**
   ```bash
   cd Docs/xwiki-export
   ls *.py  # You should see 6 Python scripts
   ```

3. **Run a test conversion** (using existing XAR file)
   ```bash
   # Convert XAR to JSON
   python xar_to_json.py FactHarbor_Spec_and_Impl_06.Feb.26.xar

   # Convert JSON to Markdown
   python json_to_md_tree.py FactHarbor_Spec_and_Impl_06.Feb.26_fulltree.json

   # Browse the generated Markdown
   # Open: FactHarbor_Spec_and_Impl_06.Feb.26_md/FactHarbor/Specification/WebHome.md
   ```

4. **If tools don't work:**
   - Email me with the error message
   - Include your Python version
   - We'll troubleshoot before the kickoff call

### Step 4: Prepare Questions (30 min)

**After reading and exploring, prepare questions about:**

- Anything unclear in the instructions
- FactHarbor's documentation priorities
- xWiki features you're unfamiliar with
- Timeline or scope concerns
- Technical terminology you need clarified

**Write them down** - we'll cover them in the kickoff call.

---

## ✅ Preparation Checklist

Before our kickoff call, complete this checklist:

- [ ] Read INSTRUCTIONS_FOR_TECH_WRITER.md
- [ ] Read ROLES_AND_RESPONSIBILITIES.md
- [ ] Skim WORKFLOW.md
- [ ] Received xWiki login credentials
- [ ] Received git repository access
- [ ] Browsed xWiki (read-only exploration)
- [ ] Cloned git repository
- [ ] Created rough inventory of content locations
- [ ] Tested conversion tools successfully
- [ ] Prepared list of questions
- [ ] Ready for kickoff call

**When you've completed this checklist, email me to confirm and we'll schedule the kickoff call.**

---

## 📞 Kickoff Call Agenda (30-45 minutes)

**What we'll cover:**

1. **FactHarbor Overview** (10 min)
   - What FactHarbor does
   - Documentation goals and audience
   - Why this consolidation matters

2. **Answer Your Questions** (10-15 min)
   - Address your preparation questions
   - Clarify any confusion from the docs

3. **Priorities & Preferences** (10 min)
   - Which documentation is most critical
   - Terminology preferences
   - Writing style guidelines

4. **Timeline & Checkpoints** (5 min)
   - Agree on timeline for each phase
   - Set checkpoint review dates
   - Establish communication preferences

5. **Next Steps** (5 min)
   - You start Task 1: Inventory
   - Confirm deliverable format
   - Set first checkpoint date

---

## 🎯 What Success Looks Like (After Preparation)

**You should feel confident about:**

- What the project is trying to achieve
- Your specific tasks and deliverables
- How to use the conversion tools
- Where to find documentation currently
- Who does what (you vs me)
- Timeline and checkpoints

**You should know:**

- How to access xWiki and git
- How to navigate the current documentation
- How to run the conversion scripts
- Who to ask when you have questions

**Red flags to mention:**

- If you can't access xWiki or git
- If conversion tools don't work
- If timeline seems too tight
- If instructions are confusing
- If you need additional resources

---

## 📧 Communication During Preparation

**Questions during prep phase:**
- Email me anytime: [your email]
- Expected response time: Within 1 business day
- Don't wait until kickoff call to ask if something is blocking you

**After kickoff call:**
- Continue via email for updates/questions
- Use [Slack/Teams/other] for quick questions
- Schedule additional calls if needed for complex topics

---

## 🚀 After Preparation → Start Task 1

**Once preparation is complete and we've had the kickoff call:**

1. Start Task 1: Inventory (from INSTRUCTIONS_FOR_TECH_WRITER.md)
2. Expected timeline: 2-4 hours
3. Deliverable: Inventory spreadsheet/document
4. Review checkpoint: [Date we'll agree on]

---

## ❓ FAQ

**Q: How technical do I need to be?**
A: Basic comfort with Markdown, file systems, and command line. The conversion tools are scripted - you just run Python commands. I'll help if you get stuck.

**Q: Do I need to know xWiki?**
A: Basic familiarity helps, but you'll learn as you go. The xWiki editor is fairly intuitive. Focus on content organization, not xWiki features.

**Q: What if I find errors in the technical content?**
A: Flag them for me to review. Don't guess - your job is organization and clarity, I handle technical accuracy.

**Q: Can I propose changes to the suggested xWiki structure?**
A: Absolutely! That's part of Task 2. Bring your expertise to the structure design.

**Q: What if this takes longer than estimated?**
A: Communicate early. If you're 50% through time but only 25% through work, let me know so we can adjust.

---

## 📦 Resources

**Key Documents:**
- Work Plan: `Docs/INSTRUCTIONS_FOR_TECH_WRITER.md`
- Roles: `Docs/ROLES_AND_RESPONSIBILITIES.md`
- Tools: `Docs/xwiki-export/WORKFLOW.md`

**Conversion Scripts:**
- Location: `Docs/xwiki-export/`
- 4 main scripts: xar_to_json.py, json_to_md_tree.py, md_tree_to_json.py, json_to_xar.py

**Current Documentation Locations:**
- xWiki: [URL I'll provide]
- Git Repo: [URL I'll provide]
- Local: `Docs/WIP/`, `Docs/ARCHIVE/`, `Docs/STATUS/`

---

**Looking forward to working with you on this project!**

Best regards,
[Your Name]
FactHarbor Project Lead

---

**Next Step:** Complete the preparation checklist above, then email me to schedule the kickoff call.
