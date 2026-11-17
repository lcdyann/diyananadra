/* =====================================================================
   projects-data.js - ALL YOUR PROJECTS ARE WRITTEN HERE
   projects.html (the list) and project.html (one project) are built from this list,
   so to add / change a project you ONLY edit this file.

   TO ADD A PROJECT: copy one whole { ... }, block, paste it below the last one, change the words.
   The order here = the order in the list.

   Each project:
     id          : short name used in the link (project.html?p=sejarahwira), no spaces
     name        : the title shown
     type        : small label above the name
     preview     : the big picture on the "choose a project" screen
     tags        : what it was built with
     link        : website link, or '' if there is none (then the Visit button hides)
     description : what your character says about it (types out like dialogue)
     screenshots : the pictures in the carousel, each { file: '...', name: '...' }
                   (name = the words on the plate above the picture)

   Pictures that are not added yet show "Add picture: ..." instead of breaking.
   ===================================================================== */

var PROJECTS = [

    {
        id: 'sejarahwira',
        name: 'SejarahWira',
        type: 'FINAL YEAR PROJECT',
        preview: 'assets/projects/sejarahwira.jpg',
        tags: ['HTML', 'CSS', 'JavaScript', 'MySQL'],
        link: 'https://sejarahwira.com',
        description: 'My final year project! A web-based, game-driven storytelling system for Year 6 Sejarah. Students fall into the history book, play as real historical figures and complete missions across 10 eras, while teachers manage their own classes, stories and question banks.',
        screenshots: [
            { file: 'assets/projects/sejarahwira/1.png', name: 'Hub' },
            { file: 'assets/projects/sejarahwira/2.png', name: 'World map' },
            { file: 'assets/projects/sejarahwira/3.png', name: 'Misi' },
            { file: 'assets/projects/sejarahwira/4.png', name: 'Kepungan Agung' }
        ]
    },

    {
        id: 'portfolio',
        name: 'Personal Portfolio',
        type: 'WEBSITE',
        preview: 'assets/me.png',
        tags: ['HTML', 'CSS', 'JavaScript'],
        link: '', /*put the GitHub repo link here if you want a Visit button*/
        description: 'The world you are standing in right now! An RPG-style portfolio with a title screen, a light and dark mode that remembers your choice, my projects as stages to explore and a Bug Snake game to play. Built with plain HTML, CSS and JavaScript.',
        screenshots: [
            { file: 'assets/projects/portfolio/1.png', name: 'Title screen' },
            { file: 'assets/projects/portfolio/2.png', name: 'About me' },
            { file: 'assets/projects/portfolio/3.png', name: 'Projects' },
            { file: 'assets/projects/portfolio/4.png', name: 'Bug Snake' }
        ]
    }

    /* ----- next project goes here (don't forget the comma after the } above) ----- */

];
