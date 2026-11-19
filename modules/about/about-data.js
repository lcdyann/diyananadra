/* =====================================================================
   about-data.js - YOUR SKILLS AND CORE COURSEWORK ARE WRITTEN HERE
   about.html is built from these two lists, so you only edit this file.
   ===================================================================== */


/* ===================== SKILLS = GACHA MACHINES =====================
   One { ... } = one machine. Its skills spill out when the machine is clicked.

   Each machine:
     name   : the label on the machine
     color  : the machine's colour
     skills : the skills inside, each { name: '...', icon: '...' }

   ICONS come from Devicon (https://devicon.dev):
     search the skill there, copy its class, e.g. 'devicon-python-plain colored'
     no icon for it? put icon: ''  -> a round badge with its first letters shows instead

   TO ADD A SKILL:   copy one { name: ..., icon: ... }, line inside a machine
   TO ADD A MACHINE: copy one whole machine block */

var SKILL_MACHINES = [

    {
        name: 'FRONTEND',
        color: '#5EC4CD',
        skills: [
            { name: 'HTML', icon: 'devicon-html5-plain colored' },
            { name: 'CSS', icon: 'devicon-css3-plain colored' },
            { name: 'JavaScript', icon: 'devicon-javascript-plain colored' },
            { name: 'Java', icon: 'devicon-java-plain colored' },
            { name: 'C++', icon: 'devicon-cplusplus-plain colored' },
            { name: 'Python', icon: 'devicon-python-plain colored' },
            { name: 'Kotlin', icon: 'devicon-kotlin-plain colored' }
        ]
    },

    {
        name: 'BACKEND',
        color: '#ff6b6b',
        skills: [
            { name: 'PHP', icon: 'devicon-php-plain colored' },
            { name: 'Laravel', icon: 'devicon-laravel-original colored' },
            { name: 'Node.js', icon: 'devicon-nodejs-plain colored' }
        ]
    },

    {
        name: 'DATA & TOOLS',
        color: '#eac231',
        skills: [
            { name: 'MySQL', icon: 'devicon-mysql-original colored' },
            { name: 'Git', icon: 'devicon-git-plain colored' },
            { name: 'GitHub', icon: 'devicon-github-original' }
        ]
    }

];


/* ===================== CORE COURSEWORK = ROLLING CAPSULES =====================
   One line = one capsule. They roll along by themselves; clicking one shows its info.

   Each course:
     name : course name
     type : 'Passive', 'Active', 'Aura' or 'Ultimate' (sets the capsule colour)
     icon : a Font Awesome icon (https://fontawesome.com/search), e.g. 'fa-solid fa-database'
     text : one short line about what you learned

   !! THESE ARE EXAMPLES - replace them with your real courses before you push !! */

var COURSES = [
    { name: 'Object-Oriented Programming', type: 'Passive', icon: 'fa-solid fa-cubes', text: 'Classes, inheritance and encapsulation become second nature.' },
    { name: 'Data Structures & Algorithms', type: 'Active', icon: 'fa-solid fa-diagram-project', text: 'Picks the fastest path through any problem.' },
    { name: 'Database Systems', type: 'Active', icon: 'fa-solid fa-database', text: 'Designs tables and SQL queries that keep real data safe.' },
    { name: 'Software Requirements', type: 'Passive', icon: 'fa-solid fa-clipboard-list', text: 'Turns what users say into clear use cases.' },
    { name: 'Software Design & Architecture', type: 'Passive', icon: 'fa-solid fa-sitemap', text: 'Class diagrams and patterns before a single line of code.' },
    { name: 'Human-Computer Interaction', type: 'Aura', icon: 'fa-solid fa-hand-pointer', text: 'Interfaces that users understand at first sight.' },
    { name: 'Software Testing', type: 'Active', icon: 'fa-solid fa-bug', text: 'Finds the bug before the user does.' },
    { name: 'Software Project Management', type: 'Aura', icon: 'fa-solid fa-flag', text: 'Keeps the team and the timeline on track.' },
    { name: 'Web Development', type: 'Active', icon: 'fa-solid fa-globe', text: 'Builds full websites from front to back.' },
    { name: 'Final Year Project', type: 'Ultimate', icon: 'fa-solid fa-star', text: 'SejarahWira: everything above, in one game.' }
];
