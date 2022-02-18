
$(document).ready(function() {
    /* ------------------------VARIABLES------------------------ */
    let lastFocusedDiv;
    let autoSaveTimer;
    const autoSaveTime = 5000;       // time between autosaves (milliseconds)
    HtmlSanitizer.AllowedTags['SUP'] = true;
    HtmlSanitizer.AllowedTags['SUB'] = true;
    HtmlSanitizer.AllowedTags['STRIKE'] = true;

    /* ------------------FUNCTION DECLARATIONS------------------ */
    /**
     * Dynamically resizes an input box to its contents
     */
    $.fn.resize = function () {
        let cursorPadding = 5;
        if($(this).val().length == 0 && $(this).attr("placeholder")) {
            $(this).next().text($(this).attr("placeholder"));
            $(this).css("width", $(this).next().width() + cursorPadding);
        } else {
            $(this).css("width", 0);
            let resizedWidth = Math.max($(this)[0].scrollWidth, $(this)[0].offsetWidth);
            $(this).css("width", resizedWidth + cursorPadding);
        }
        return this;
    }

    /**
     * Validates word count goal. If inputted goal is not legal, changes to a legal value.
     */
    function validateWCgoal () {
        let max = parseInt($("#wc_input").attr("max")),
            min = parseInt($("#wc_input").attr("min")),
            wc = parseInt($("#wc_input").val()),
            validWC = wc > max ? max : (wc < min || !wc) ? min : wc;
        $("#wc_input").val(validWC);
    }

    /**
     * Sets the global word count goal.
     */
    function setWCgoal () {
        validateWCgoal();                   // sets new goal
        
        $(".wc").trigger("checkGoal");      // check all word counts if they meet the goal
    }

    /**
     * Increments the drabble counter.
     */
    function updateDrabbleCount () {
        $("#drabble_count").text($("[data-goalHit='true']").length);
    }

    /**
     * Change font family.
     * @param {string} font  the font family
     */
    function changeFont (font) {
        $("[contenteditable='true']").each(function() {
            $(this).css("font-family", font);
        });
    }

    /**
     * Change font size.
     * @param {number} size  the font size
     */
    function changeFontSize (size) {
        $(".drabble").each(function() {
            $(this).css("font-size", size);
        });
    }

    /**
     * Generates a unique ID for drabbles.
     */
    let uniqueID = (function () {
        let i = 0;
        return function() {
            return i++;
        }
    })();

    /**
     * Creates a new drabble div.
     * @param {string} text    the text of the drabble, if it exists. Else, defaults to nothing
     * @param {string} prompt  the drabble's prompt, if it exists. Else, defaults to empty string
     */
    function newDrabble (text = '<p><br></p>', prompt = '') {
        const currID = uniqueID(),
            prompt_placeholder = getPromptPlaceholderTxt(),
            drabble = `<div class='drabble' id='d_${currID}' contenteditable='true'>${text}</div>`,
            drabble_del = `<button class='del_btn' id='d_del_${currID}' title='Delete Drabble'>
                                <i class="fas fa-trash-alt"></i>
                            </button>`,
            drabble_prompt = `<input class='prompt' id='pr_${currID}' placeholder='${prompt_placeholder}' title='Prompt'><span class='hide'></span>`,
            drabble_wc = `<div class='drabble_wc_wrapper'>
                            <div class='drabble_wc' id='d_wc_${currID}'>${drabble_prompt} 
                                words: <span class='wc' id='wc_${currID}'>0</span>
                                ${drabble_del}
                            </div>
                        </div>`,
            drag_icon = '<div class="draggable"><i class="fas fa-grip-lines-vertical" title="Drag"></i></div>',
            drabble_wrapper = `<div class='drabble_wrapper' id='d_wrap_${currID}' data-goalHit='false'>
                                ${drag_icon}
                                <div class='d_wc_bundle'>${drabble}${drabble_wc}</div>
                            </div>`;
        
        if($("#editor_wrapper").children().length == 0) {       // if first drabble, add directly
            $("#editor_wrapper").append(drabble_wrapper);
        } else {                                                // add new drabble after the current focus
            $(drabble_wrapper).insertAfter(lastFocusedDiv.parents(".drabble_wrapper"));
        }
        lastFocusedDiv = $(`#d_${currID}`);
        $(`#pr_${currID}`).val(prompt);
        $(`#pr_${currID}`).resize();
        $(`#d_${currID}`).focus();
    }

    /**
     * Deletes the selected drabble.
     * @param {selector} selector  the .drabble_wrapper of the drabble to be deleted
     */
    function deleteDrabble (selector) {
        if(confirm("This will delete the entire selected drabble. \nThis cannot be undone. Are you sure?")) {
            selector.remove();
        } else {
            alert("If you just want to temporarily remove a drabble from the tracker,"
                + " try commenting it out instead using the eye button or CTRL+'/'.");
        }
    }

    /**
     * Saves the current word count goal, working title, summary, and drabbles to localStorage. All inputs are sanitized.
     */
    function save () {
        const wc_input = HtmlSanitizer.SanitizeHtml($("#wc_input").val()),
            working_title = HtmlSanitizer.SanitizeHtml($("#working_title").val()),
            drabbles = getDrabbles(),
            summary = HtmlSanitizer.SanitizeHtml($("#summary_wrapper").html().replaceAll(getSummaryPlaceholderTxt(), ''));

        localStorage.setItem('wc_input', wc_input);             // store word count goal
        localStorage.setItem('working_title', working_title);   // store working title
        localStorage.setItem('drabbles', JSON.stringify(Object.fromEntries(drabbles)));      // store drabbles
        localStorage.setItem('summary', summary);               // store summary
    }

    /**
     * Loads the current word count goal, working title, summary, and drabbles from localStorage.
     */
    function load () {
        const wc_input = localStorage.getItem('wc_input'),
            working_title = localStorage.getItem('working_title'),
            summary = localStorage.getItem('summary'),
            drabbles = new Map(Object.entries(JSON.parse(localStorage.getItem('drabbles'))));
        if(wc_input !== null) {
            $("#wc_input").val(wc_input);
            $("#wc_input").trigger("input");
        }
        if(working_title !== null) {
            $("#working_title").val(working_title);
            $("#working_title").trigger("input");
        }
        if(summary !== null) {
            $("#summary_wrapper").html(summary);
            $("#summary_wrapper").trigger("focusout");
        }
        if(drabbles !== null) {
            $(".drabble_wrapper").remove();                     // clear current work; TBA: alert message if there is a project in progress
            drabbles.forEach((prompt, drabble) => {             // Add new drabble with its prompt
                newDrabble(drabble, prompt);
                lastFocusedDiv.trigger("input");                // Dynamically calculate word count
            });
            $(".drabble").blur(); 
        }
    }

    /**
     * Saves the localStorage contents (word count goal, working title, summary, and drabbles) to a local file on disk.
     */
    function saveProject () {
        save();
        let a = document.createElement("a"),
            file = new Blob([getProjectJSON()], {type: "application/json"});
        a.href = URL.createObjectURL(file);
        a.download ='project.dbb';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        $("#autosave_msg").text("Saved");
    }

    /**
     * Opens a project from a local project file on disk.
     * @param {string} project the project json
     */
    function openProject (project) {
       let json = JSON.parse(project);
        localStorage.setItem("wc_input", json.wc_input);
        localStorage.setItem("working_title", json.working_title);
        localStorage.setItem("summary", json.summary);
        localStorage.setItem("drabbles", json.drabbles);
        load();
    }

    /**
     * Opens a project file
     * @param {function} func  the function to run on the file (openProject()); loads the project JSON 
     */
    function openFile (func) {
        readFile = function (e) {
            let file = e.target.files[0];
            if (!file) {
                return;
            }
            if (getExtension(file.name) != 'dbb') {
                $("#autosave_msg").text("Invalid project file");
                return;
            }
            let fr = new FileReader();
            fr.onload = function(e) {
                let project = e.target.result;
                input.func(project);
                $("#autosave_msg").text("Loaded");        
                clearTimeout(autoSaveTimer);
            };
            fr.readAsText(file);
        }
        input = document.createElement("input");
        input.type = 'file';
        input.onchange = readFile;
        input.func = func;
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    /**
     * Gets the extension of a file name
     * @param {string} path  the name of the file
     */
    function getExtension (path) {
        var basename = path.split(/[\\/]/).pop(),  // extract file name from full path ...
                                                   // (supports `\\` and `/` separators)
            pos = basename.lastIndexOf(".");       // get last position of `.`
    
        if (basename === "" || pos < 1)            // if file name is empty or ...
            return "";                             //  `.` not found (-1) or comes first (0)
    
        return basename.slice(pos + 1);            // extract extension ignoring `.`
    }

    /**
     * Generates a basic readable HTML to be exported as .doc
     */
    function generateDocument() {
        let doc = document.createElement("div"),
            doc_title = document.createElement("p"),
            doc_summary = document.createElement("p"),
            drabbles = new Map(Object.entries(JSON.parse(localStorage.getItem('drabbles'))));

        $(doc).attr("class", "export");

        // Add working title
        $(doc_title).text(localStorage.getItem("working_title"));
        doc.appendChild(doc_title);

        // Add summary
        $(doc_summary).html(localStorage.getItem("summary"));
        doc.appendChild(doc_summary);

        drabbles.forEach((prompt, drabble) => {
            let drabble_prompt = document.createElement("p");
            $(drabble_prompt).text(prompt);

            let drabble_text = document.createElement("p");
            $(drabble_text).html(drabble);
        
            doc.appendChild(document.createElement("hr"));          // separator
            doc.appendChild(drabble_prompt);
            doc.appendChild(drabble_text);
        });

        return doc;
    }

    /**
     * Clears all user inputs and returns them to default values.
     */
    function clear () {
        $("#working_title").val("");            // reset working_title
        $("#working_title").resize();

        $("#summary_wrapper").empty();          // reset summary
        $("#summary_wrapper").blur();

        $("#editor_wrapper").empty();           // reset drabbles
        $("#new_drabble").trigger("click");     // Create a starter drabble
        $(".drabble").blur();                           

        $("#wc_input").val(100);                // reset wc_input
        $("#wc_input").trigger('input');
    }

    /**
     * Get placeholder text for a prompt box.
     * @returns {string}  Placeholder text for prompt
     */
    function getPromptPlaceholderTxt() {
        return 'Add a prompt...';
    }

    /**
     * Get placeholder text for a drabble box.
     * @returns {string}  Placeholder text for drabbles
     */
    function getDrabblePlaceholderTxt() {
        return '<span class="placeholder">Start a drabble...</span>';
    }

    /**
     * Get placeholder text for the summary box.
     * @returns {string}  Placeholder text for summary
     */
    function getSummaryPlaceholderTxt() {
        return '<span class="placeholder">Add a summary...</span>';
    }

    /**
     * Displays placeholder text.
     * @param {string} text  the placeholder text
     */
    $.fn.showPlaceholderTxt = function (text) {
        if($(this).find("p").text().trim().length == 0) {       
            $(this).html("<p>" + text + "</p>");
        }
    }

    /**
     * Removes placeholder text.
     */
    $.fn.removePlaceholderTxt = function () {
        if($(this).has(".placeholder")) {
            const ph = $(this).find(".placeholder");
            ph.replaceWith("<br>");
        }
    }

    /**
     * Gets a map containing all sanitized drabbles on the page and their prompts.
     * @returns {Map} key: drabble string, value: prompt string (empty if does not exist)
     */
    function getDrabbles () {
        const drabbles = new Map();

        $(".drabble").each(function() {
            const prompt_id = "pr" + $(this).attr("id").substring(1);
            drabbles.set(HtmlSanitizer.SanitizeHtml($(this).html().replaceAll(getDrabblePlaceholderTxt(), '')),
                HtmlSanitizer.SanitizeHtml($(`#${prompt_id}`).val()));
        });

        return drabbles;
    }
    
    /**
     * Gets word count goal, title, summary, and drabbles as a JSON string.
     * @returns {string} JSON of localStorage assets
     */
    function getProjectJSON () {
        let obj = new Object();
        obj.wc_input = localStorage.getItem('wc_input');
        obj.working_title = localStorage.getItem('working_title');
        obj.drabbles = localStorage.getItem('drabbles');
        obj.summary = localStorage.getItem('summary');
        return JSON.stringify(obj);
    }

    /* ---------------------EVENT LISTENERS--------------------- */
    $("#wc_input").on('input', function () {            // wc_input listeners
        setWCgoal();
    });


    $("#wc_input").on('input', function () {           // dynamically resize input boxes
        $("#wc_input").resize();
    });
    $("#working_title").on('input', function() {
        $("#working_title").resize();
    });
    $("#editor_wrapper").on('input', '.prompt', function() {
        $(this).resize();
    });


    $(".format_btn").mousedown(function(e) {            // prevent loss of focus on button press
        e.preventDefault();
    });
    $(".mode_btn").mousedown(function(e) {
        e.preventDefault();
    });
    $("#prompts_on").click(function() {
        if($(".prompt").css("display") == "none") {
            $(".prompt").css("display", "");
        } else {
            $(".prompt").css("display", "none");
        }
    });
    $("#font_family").on('change', function() {         // format_btn listeners
        const font = $(this).val();
        changeFont(font);
    });
    $("#font_size").on('input', function() {            
        const size = $(this).val();
        changeFontSize(size);
    });
    $("#bold").click(function() {
        document.execCommand("bold", false, null);
    });
    $("#italics").click(function() {
        document.execCommand("italic", false, null);
    });
    $("#underline").click(function() {
        document.execCommand("underline", false, null);
    })
    ;$("#strike").click(function() {
        document.execCommand("strikethrough", false, null);
    });
    $("#subscript").click(function() {
        document.execCommand("subscript", false, null);
    });
    $("#superscript").click(function() {
        document.execCommand("superscript", false, null);
    });
    $("#align_left").click(function() {
        document.execCommand("justifyLeft", false, null);
    });
    $("#align_center").click(function() {
        document.execCommand("justifyCenter", false, null);
    });
    $("#align_right").click(function() {
        document.execCommand("justifyRight", false, null);
    });
    $("#align_justify").click(function() {
        document.execCommand("justifyFull", false, null);
    });


    $("#save_options").click(function(e) {              // Open menu
        if($("#save_menu").first().is(":hidden")) {
            $("#save_options").addClass("rotated");
            $("#save_menu").slideDown();
            e.stopPropagation();
        } else {
            $("#save_menu").slideUp();
            $("#save_options").removeClass("rotated");
        }
    });
    $("body").click(function(e) {                       // Close menu on outside click
        const menu = $("#save_menu");
        if(!$("#save_menu").first().is(":hidden") && $(e.target).attr("id") != "save_menu") {
            $("#save_menu").slideUp();
            $("#save_options").removeClass("rotated");
        }
    });
    $("#save").click(function() {                       // save project to local file
        clearTimeout(autoSaveTimer);
        saveProject();
    });
    $("#open").click(function(e) {                      // opens a project from local disk
        openFile(openProject);
    });
    $("#export").click(function(e) {                    // saves and exports the current project
        save();
        let export_doc = generateDocument();
        document.body.appendChild(export_doc);
        $(document).googoose({
            area: '.export'
        });
        document.body.removeChild(export_doc);
        clearTimeout(autoSaveTimer);
        $("#autosave_msg").text("Saved");
    });
    $("#new").click(function(e) {
        if(confirm("This will remove all drabbles and progress and cannot be undone.\n\nPlease save or export your current project first!"
                    + "\n\nAre you sure you want to start a new project now?")) {
            clear();
            clearTimeout(autoSaveTimer);
        }
    });
    $("body").on('input', function() {                  // autosave
        clearTimeout(autoSaveTimer);
        $("#autosave_msg").text("");
        autoSaveTimer = setTimeout(function() {
            save();
            $("#autosave_msg").text("Autosaved");
        }, autoSaveTime);
    });
    

    $(window).keydown(function(e) {                 // override default keyboard shortcuts
        if(e.ctrlKey && e.code == 'KeyS') {         // Strikethrough
          e.preventDefault(); 
          $("#strike").trigger("click");
        }
        if(e.ctrlKey && e.code == 'KeyD') {         // New drabble
          e.preventDefault(); 
          $("#new_drabble").trigger("click");
        }
      });
    
    $("body").on('paste', '[contenteditable]', function(e) {        // sanitize pasting
        e.preventDefault();
        const text = (e.originalEvent || e).clipboardData.getData('text/plain');
        window.document.execCommand('inserttext', false, text);
    });

    /* For tracking word count per drabble */
    $("#editor_wrapper").on('input', '.drabble', function() {
        if($(this).html().trim() == "" || $(this).html().trim() == "<br>") {
            $(this).html("<p><br></p>");
        }
    });

    $("#editor_wrapper").on('input', '.drabble', function() {      
        const text = $(this)[0].innerText,                        // get text
            match = text.match(/([\w'-]+)/g),                   // find words
            numOfWords = match !== null ? match.length : 0,     // if there are words, count them, else 0
            wordCounter = $(this).siblings(".drabble_wc_wrapper").children(".drabble_wc").children(".wc");
        wordCounter.text(numOfWords);                           // update word counter
        wordCounter.trigger("checkGoal");                       // check if word count goal has been met
    });


    /* For checking if word count goal has been met */
    $("#editor_wrapper").on('checkGoal', '.wc', function() {
        const wrapper = $(this).parents(".drabble_wrapper");
        if($(this).text() == $("#wc_input").val()) {                          // If goal met, notify listeners
            wrapper.attr("data-goalHit", "true");
        } else {                                                // else, toggle data-goalHit to false
            wrapper.attr("data-goalHit", "false");
        }
        updateDrabbleCount();                                   // update drabble count
    });


    /* For controlling placeholder text display */
    $("#editor_wrapper").on('focus', '.drabble', function() {    
        lastFocusedDiv = $(this);                               // keeps record of current div being typed on
        $(this).removePlaceholderTxt();                         // removes drabble placeholder text on focus

    })
    $("#editor_wrapper").on('focusout', '.drabble', function() {
        $(this).showPlaceholderTxt(getDrabblePlaceholderTxt());     // adds drabble placeholder text on focus out
    });
    $("#summary_wrapper").on('focus', function() {                  // removes summary placeholder text on focus
        $(this).removePlaceholderTxt();
    });
    $("#summary_wrapper").on('focusout', function() {               // adds summary placeholder text on focus out
        $(this).showPlaceholderTxt(getSummaryPlaceholderTxt());
    });


    /* For drabble creation */
    $("#new_drabble").click(function() {                // new drabble listener
        newDrabble();
    });
    /* For drabble deletion */
    $("#editor_wrapper").on('click', '.del_btn', function() {       // deletes drabble
        deleteDrabble($(this).parents(".drabble_wrapper"));
        if($(".drabble_wrapper").length == 0) {
            alert("Looks like you're starting fresh. Here's a new drabble to get you started!");
            newDrabble();
        }
        updateDrabbleCount();           // update new drabble count
    });

    /* ----------------------ON PAGE LOAD---------------------- */
    $("body").overlayScrollbars({ className : "os-theme-light" });    // Use custom scrollbar
    $("#wc_input").trigger("input");                // Set wc goal and working title
    $("#working_title").resize();
    changeFontSize($("#font_size").val());          // Set the default font size
    $(".font").each( function () {                  // Make font family options display their font
        $(this).css("font-family", $(this).val());
    });

    $("#editor_wrapper").sortable({          // make drabbles draggable
        cancel: ':input,button,[contenteditable]', 
        cursor: "grabbing",
        helper: "clone",                     // add shadow on drag
        start: function (e, ui) {
            $(ui.helper).css('boxShadow', '4px 4px 4px #000000');
        }
    });

    document.execCommand('defaultParagraphSeparator', false, 'p');      // Make contenteditable additions in paragraph tag
    if(localStorage.getItem('working_title') || localStorage.getItem('summary') || localStorage.getItem('wc_input') || localStorage.getItem('drabbles')) {
        load();                                     // keep project open
    }
    if($("#editor_wrapper").children().length == 0) {
        $("#new_drabble").trigger("click");
        $(".drabble").blur();
    }
    $("#summary_wrapper").blur();
    clearTimeout(autoSaveTimer);                  
})