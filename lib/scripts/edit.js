/**
 * Functions for text editing (toolbar stuff)
 *
 * @todo most of the stuff in here should be revamped and then moved to toolbar.js
 * @author Andreas Gohr <andi@splitbrain.org>
 */

/**
 * Creates a toolbar button through the DOM
 *
 * Style the buttons through the toolbutton class
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 * @author Michal Rezler <m.rezler@centrum.cz> 
 */
function createToolButton(icon,label,key,id,classname){
    var $ = jQuery;
    var btn = $('<button>');
    var ico = $('<img />');

    // preapare the basic button stuff
    btn.attr('class', 'toolbutton');
    if(classname){
        btn.attr('class', 'toolbutton '+classname);
    }
    
    btn.attr('title', label);
    if(key){
        btn.attr('title', label + ' ['+key.toUpperCase()+']')
            .attr('accessKey', key);    
    }

    // set IDs if given
    if(id){
        btn.attr('id', id);
        ico.attr('id', id+'_ico');
    }

    // create the icon and add it to the button
    if(icon.substr(0,1) == '/'){
        ico.attr('src', icon);
    }else{
        ico.attr('src', DOKU_BASE+'lib/images/toolbar/'+icon);
    }
    btn.append(ico);
                     
    // we have to return a javascript object (for compatibility reasons)                             
    return btn[0];
}

/**
 * Creates a picker window for inserting text
 *
 * The given list can be an associative array with text,icon pairs
 * or a simple list of text. Style the picker window through the picker
 * class or the picker buttons with the pickerbutton class. Picker
 * windows are appended to the body and created invisible.
 *
 * @param  string id    the ID to assign to the picker
 * @param  array  props the properties for the picker
 * @param  string edid  the ID of the textarea
 * @rteurn DOMobject    the created picker
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function createPicker(id,props,edid){
    var icobase = props['icobase'];
    var list = props['list'];
    var $ = jQuery;

    // create the wrapping div
    var picker = $('<div></div>');
    
    var className = 'picker';
    if(props['class']){
        className += ' '+props['class'];
    }
    
    picker.attr('class', className)
        .attr('id', id)
        .css('position', 'absolute')
        .css('marginLeft', '-10000px') // no display:none, to keep access keys working
        .css('marginTop', '-10000px');

    for(var key in list){
        if (!list.hasOwnProperty(key)) continue;

        if(isNaN(key)){
            // associative array -> treat as image/value pairs
            var btn = $('<button>');
            btn.attr('class', 'pickerbutton')
                .attr('title', key);
            
            var ico = $('<img>');
            if (list[key].substr(0,1) == '/') {
                var src = list[key];
            } else {
                var src = DOKU_BASE+'lib/images/'+icobase+'/'+list[key];
            }
            
            ico.attr('src', src);
            btn.append(ico);
            
            btn.bind('click', bind(pickerInsert, key, edid));
            picker.append(btn);
        }else if (typeof (list[key]) == 'string'){
            // a list of text -> treat as text picker
            var btn = $('<button>');
            btn.attr('class', 'pickerbutton')
                .attr('title', list[key]);
            
            var txt = $(document.createTextNode(list[key]));
            btn.append(txt);
            
            btn.bind('click', bind(pickerInsert, list[key], edid));
            
            picker.append(btn);
        }else{
            // a list of lists -> treat it as subtoolbar
            initToolbar(picker,edid,list);
            break; // all buttons handled already
        }

    }
    var body = $('body');
    body.append(picker);
    
    // we have to return a javascript object (for compatibility reasons)
    return picker[0];
}

/**
 * Called by picker buttons to insert Text and close the picker again
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function pickerInsert(text,edid){
    insertAtCarret(edid,text);
    pickerClose();
}

/**
 * Add button action for signature button
 *
 * @param  DOMElement btn   Button element to add the action to
 * @param  array      props Associative array of button properties
 * @param  string     edid  ID of the editor textarea
 * @return boolean    If button should be appended
 * @author Gabriel Birke <birke@d-scribe.de>
 */
function addBtnActionSignature(btn, props, edid) {
    if(typeof(SIG) != 'undefined' && SIG != ''){
        btn.bind('click', bind(insertAtCarret,edid,SIG));
        return true;
    }
    return false;
}

/**
 * Make intended formattings easier to handle
 *
 * Listens to all key inputs and handle indentions
 * of lists and code blocks
 *
 * Currently handles space, backspce and enter presses
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 * @fixme handle tabs
 */
function keyHandler(e){
    if(e.keyCode != 13 &&
       e.keyCode != 8  &&
       e.keyCode != 32) return;
    var field     = e.target;
    var selection = getSelection(field);
    if(selection.getLength()) return; //there was text selected, keep standard behavior
    var search    = "\n"+field.value.substr(0,selection.start);
    var linestart = Math.max(search.lastIndexOf("\n"),
                             search.lastIndexOf("\r")); //IE workaround
    search = search.substr(linestart);


    if(e.keyCode == 13){ // Enter
        // keep current indention for lists and code
        var match = search.match(/(\n  +([\*-] ?)?)/);
        if(match){
            var scroll = field.scrollHeight;
            var match2 = search.match(/^\n  +[\*-]\s*$/);
            // Cancel list if the last item is empty (i. e. two times enter)
            if (match2 && field.value.substr(selection.start).match(/^($|\r?\n)/)) {
                field.value = field.value.substr(0, linestart) + "\n" +
                              field.value.substr(selection.start);
                selection.start = linestart + 1;
                selection.end = linestart + 1;
                setSelection(selection);
            } else {
                insertAtCarret(field.id,match[1]);
            }
            field.scrollTop += (field.scrollHeight - scroll);
            e.preventDefault(); // prevent enter key
            return false;
        }
    }else if(e.keyCode == 8){ // Backspace
        // unindent lists
        var match = search.match(/(\n  +)([*-] ?)$/);
        if(match){
            var spaces = match[1].length-1;

            if(spaces > 3){ // unindent one level
                field.value = field.value.substr(0,linestart)+
                              field.value.substr(linestart+2);
                selection.start = selection.start - 2;
                selection.end   = selection.start;
            }else{ // delete list point
                field.value = field.value.substr(0,linestart)+
                              field.value.substr(selection.start);
                selection.start = linestart;
                selection.end   = linestart;
            }
            setSelection(selection);
            e.preventDefault(); // prevent backspace
            return false;
        }
    }else if(e.keyCode == 32){ // Space
        // intend list item
        var match = search.match(/(\n  +)([*-] )$/);
        if(match){
            field.value = field.value.substr(0,linestart)+'  '+
                          field.value.substr(linestart);
            selection.start = selection.start + 2;
            selection.end   = selection.start;
            setSelection(selection);
            e.preventDefault(); // prevent space
            return false;
        }
    }
}

/**
 * Determine the current section level while editing
 *
 * @author Andreas Gohr <gohr@cosmocode.de>
 */
function currentHeadlineLevel(textboxId){
    var field     = $(textboxId);
    var selection = getSelection(field);
    var search    = "\n"+field.value.substr(0,selection.start);
    var lasthl    = search.lastIndexOf("\n==");
    if(lasthl == -1 && field.form.prefix){
        // we need to look in prefix context
        search = field.form.prefix.value;
        lasthl    = search.lastIndexOf("\n==");
    }
    search    = search.substr(lasthl+1,6);

    if(search == '======') return 1;
    if(search.substr(0,5) == '=====') return 2;
    if(search.substr(0,4) == '====') return 3;
    if(search.substr(0,3) == '===') return 4;
    if(search.substr(0,2) == '==') return 5;

    return 0;
}


/**
 * global var used for not saved yet warning
 */
var textChanged = false;

/**
 * Delete the draft before leaving the page
 */
function deleteDraft() {
    if (is_opera) return;
    if (window.keepDraft) return;

    // remove a possibly saved draft using ajax
    var dwform = jQuery('#dw__editform');
    if(dwform.length != 0) {
    
        jQuery.post(
            DOKU_BASE + 'lib/exe/ajax.php',
            {
                call: 'draftdel',
                id: jQuery('#dw__editform input[name=id]').val()
            }
        );
    }
}

/**
 * Activate "not saved" dialog, add draft deletion to page unload,
 * add handlers to monitor changes
 *
 * Sets focus to the editbox as well
 */
addInitEvent(function () {
    var $ = jQuery;            
    var editform = $('#dw__editform');
    if (editform.length == 0) return;

    var edit_text = $('#wiki__text');
    if (edit_text.length > 0) {        
        if(edit_text.attr('readOnly')) return;
        
        // in Firefox, keypress doesn't send the correct keycodes,
        // in Opera, the default of keydown can't be prevented
        if (is_opera) {
            edit_text.keypress(keyHandler);
        } else {
            edit_text.keydown(keyHandler);
        }
                              
        // set focus
        edit_text.focus();
    }
                                      
    var checkfunc = function() {
        textChanged = true; //global var
        summaryCheck();
    };                              
    
    editform.change(checkfunc);         
    editform.keydown(checkfunc);

    window.onbeforeunload = function(){
        if(textChanged) {
            return LANG.notsavedyet;
        }
    };
    window.onunload = deleteDraft;

    // reset change memory var on submit
    $('#edbtn__save').click(
        function() {
            textChanged = false;
        }
    );
    $('#edbtn__preview').click(
        function() {
            textChanged = false;
            window.keepDraft = true; // needed to keep draft on page unload
        }
    );

    var summary = $('#edit__summary');
    summary.change(summaryCheck);
    summary.keyup(summaryCheck);
    
    if (textChanged) summaryCheck();
});

/**
 * Checks if a summary was entered - if not the style is changed
 *
 * @author Andreas Gohr <andi@splitbrain.org>
 */
function summaryCheck(){
    var sum = jQuery('#edit__summary');

    if (sum.val() === '') {
        sum.attr('class', 'missing');
    } else{
        sum.attr('class', 'edit');
    }
}
