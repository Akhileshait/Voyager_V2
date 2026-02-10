/**
 * Voyager Career Assessment Data
 * Consists of Discovery Questions (Category-based) 
 * and Psychometric Statements (Scale-based).
 */

const VOYAGER_ASSESSMENT = {
  discovery: [
    {
      id: "d1",
      question: "When you have a completely free afternoon, what are you most likely to do?",
      options: [
        { label: "Research a new topic or dive into a documentary.", value: "Investigative" },
        { label: "Build, fix, or create something physical or digital.", value: "Realistic" },
        { label: "Organize a gathering or catch up with friends.", value: "Social" },
        { label: "Plan a side project or set personal goals.", value: "Enterprising" }
      ]
    },
    {
      id: "d2",
      question: "Which of these tasks feels most like 'play' and least like 'work'?",
      options: [
        { label: "Solving a complex logic puzzle or math problem.", value: "Analytical" },
        { label: "Writing, drawing, or designing a layout.", value: "Creative" },
        { label: "Helping someone understand a difficult concept.", value: "Empathetic" },
        { label: "Managing a team to achieve a specific result.", value: "Operational" }
      ]
    },
    {
      id: "d3",
      question: "When faced with a complex puzzle, what is your first instinct?",
      options: [
        { label: "Break it down into smaller, logical parts.", value: "Technical" },
        { label: "Look for a creative 'outside the box' shortcut.", value: "Innovative" },
        { label: "Ask others for their perspective and collaborate.", value: "Collaborative" },
        { label: "Start testing things immediately to see what happens.", value: "Experimental" }
      ]
    },
    {
      id: "d4",
      question: "What kind of environment makes you feel most energized?",
      options: [
        { label: "A quiet, high-tech lab or focused workspace.", value: "Focused" },
        { label: "A vibrant, aesthetically pleasing studio or agency.", value: "Creative" },
        { label: "A bustling environment where I interact with people.", value: "Social" },
        { label: "A professional, fast-paced corporate office or boardroom.", value: "Corporate" }
      ]
    },
    {
      id: "d5",
      question: "In a group project, which role do you naturally gravitate toward?",
      options: [
        { label: "The Specialist: I handle the most technical/difficult part.", value: "Specialist" },
        { label: "The Visionary: I come up with the big idea and the look.", value: "Visionary" },
        { label: "The Facilitator: I make sure everyone is happy and working well.", value: "Facilitator" },
        { label: "The Captain: I delegate tasks and keep us on schedule.", value: "Captain" }
      ]
    },
    {
      id: "d6",
      question: "What is the most important reward you hope to get from your career?",
      options: [
        { label: "Innovation: Being at the cutting edge of my field.", value: "Innovation" },
        { label: "Expression: Bringing my unique ideas to life.", value: "Expression" },
        { label: "Contribution: Making a tangible difference in the world.", value: "Impact" },
        { label: "Growth: Climbing the ladder and achieving high status/income.", value: "Growth" }
      ]
    },
    {
      id: "d7",
      question: "Do you prefer working with abstract ideas, raw data, or physical objects?",
      options: [
        { label: "Raw Data: I like patterns, numbers, and hard evidence.", value: "Data" },
        { label: "Abstract Ideas: I like philosophy, theories, and concepts.", value: "Ideas" },
        { label: "Physical Objects: I like tools, machinery, or tangible products.", value: "Tangible" },
        { label: "People: I prefer working with human dynamics over 'things'.", value: "People" }
      ]
    },
    {
      id: "d8",
      question: "How do you feel about high-pressure deadlines and fast-paced changes?",
      options: [
        { label: "I prefer a steady, predictable pace so I can focus on quality.", value: "Steady" },
        { label: "I find them stressful but manageable with enough planning.", value: "Structured" },
        { label: "I thrive under pressure; it keeps me motivated.", value: "Dynamic" },
        { label: "I enjoy change as long as I am the one leading it.", value: "Leadership" }
      ]
    },
    {
      id: "d9",
      question: "How do you prefer to learn a new, difficult skill?",
      options: [
        { label: "Reading manuals, books, or documentation.", value: "Visual-Logical" },
        { label: "Watching a demonstration or video tutorial.", value: "Observational" },
        { label: "Discussing it with an expert or mentor.", value: "Verbal" },
        { label: "Jumping in and trying it yourself (Trial & Error).", value: "Kinesthetic" }
      ]
    },
    {
      id: "d10",
      question: "If you could solve one global problem, what would it be?",
      options: [
        { label: "Advancing technology to solve energy or space travel.", value: "STEM" },
        { label: "Promoting cultural understanding through media and arts.", value: "Arts" },
        { label: "Improving healthcare or education for the underserved.", value: "Service" },
        { label: "Building sustainable businesses and economic systems.", value: "Commerce" }
      ]
    }
  ],
  psychometric: [
    { id: "p1", statement: "I enjoy taking charge of a group even if the path forward is unclear.", trait: "Leadership" },
    { id: "p2", statement: "I find more satisfaction in finishing a task than in coming up with the idea.", trait: "Execution" },
    { id: "p3", statement: "I am comfortable with a career that requires constant learning and re-skilling.", trait: "GrowthMindset" },
    { id: "p4", statement: "Having a predictable daily routine is essential for my productivity.", trait: "Structure" },
    { id: "p5", statement: "I would rather work on a project alone than as part of a high-energy team.", trait: "Autonomy" },
    { id: "p6", statement: "I am drawn to technical details and 'how things work' under the hood.", trait: "TechnicalAptitude" },
    { id: "p7", statement: "It is important to me that my work has a direct, visible impact on people's lives.", trait: "SocialImpact" },
    { id: "p8", statement: "I am willing to take significant financial risks for the chance of a high reward.", trait: "RiskTolerance" },
    { id: "p9", statement: "I prefer expressing myself through writing or art rather than data or logic.", trait: "Creativity" },
    { id: "p10", statement: "I can stay focused on a single task for several hours without getting bored.", trait: "DeepWork" }
  ]
};