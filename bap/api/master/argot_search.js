//
// This file is part of Argot.
// Copyright (C) 2010-2012 Xavier Clerc.
//
// Argot is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 3 of the License, or
// (at your option) any later version.
//
// Argot is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

// Global name table: mapping from names to list of OCaml elements
var names = new Object();

// Global word table: mapping from words to list of OCaml elements
var words = new Object();

// Global instance table: list of all OCaml elements
var instances = new Array();

// Adds the element 'e' with name 'n' to the name table
function names_add(n, e) {
    var list = names[n];
    if (!list) {
        list = new Array();
        names[n] = list;
    }
    list.push(e);
}

// Adds the element 'e' with word 'w' to the word table
function word_add(w, e) {
    var list = words[w];
    if (!list) {
        list = new Array();
        words[w] = list;
    }
    list.push(e);
}

// Parses the passed string into a type
function parse_type(s) {
    return argot_parser.parse(s);
}

// Constructs a type list, removing optional parameters
function make_type_list(t) {
    try {
        var res = new Array();
        var len = power2(get_optional_count(t));
        if (len == 1) {
            res.push(normalize(t));
        } else {
            for (var i = 0; i < len; i++) {
                res.push(normalize(nth_signature(t, i)));
            }
        }
        return res;
    } catch (e) {
        return null;
    }
}

// Constructs an 'OCaml_type'
function OCaml_type(t) {
    this.type_as_string = t;
    try {
        if (t.indexOf("...") == -1) {
            var parsed = parse_type(t);
            var manifested = rewrite_manifests(parsed);
            this.type_as_normal_form = make_type_list(parsed);
            this.type_as_normal_form_manifest = make_type_list(manifested);
        } else {
            this.type_as_normal_form = null;
            this.type_as_normal_form_manifest = null;
        }
    } catch (e) {
        this.type_as_normal_form = null;
        this.type_as_normal_form_manifest = null;
    }
}

// Compares two types
function same_type(x, y) {
    if ((x.type_as_normal_form == null) || (y.type_as_normal_form == null)) {
        return x.type_as_string.replace(/ /g, '') == y.type_as_string.replace(/ /g, '');
    } else {
        for (var i = 0; i < x.type_as_normal_form.length; i++) {
            for (var j = 0; j < y.type_as_normal_form.length; j++) {
                var res = equal_normal_form(x.type_as_normal_form[i],
                                            y.type_as_normal_form[j]);
                if (res) return res;
            }
        }
    }
}

// Compares two types, using manifest
function same_type_manifest(x, y) {
    if ((x.type_as_normal_form_manifest == null) || (y.type_as_normal_form_manifest == null)) {
        return x.type_as_string.replace(/ /g, '') == y.type_as_string.replace(/ /g, '');
    } else {
        for (var i = 0; i < x.type_as_normal_form_manifest.length; i++) {
            for (var j = 0; j < y.type_as_normal_form_manifest.length; j++) {
                var res = equal_normal_form(x.type_as_normal_form_manifest[i],
                                            y.type_as_normal_form_manifest[j]);
                if (res) return res;
            }
        }
    }
}

// Constructs an 'OCaml_element'
function OCaml_element(sn, fn, k, t, r, d) {
    this.short_name = sn;
    this.full_name = fn;
    this.kind = k;
    this.type = new OCaml_type(t);
    this.reference = r;
    this.documentation = d;
}

// Compares two OCaml elements (using full names)
function compare(x, y) {
    if (x.full_name < y.full_name) {
        return -1;
    } else if (x.full_name > y.full_name) {
        return 1;
    } else {
        return 0;
    }
}

// Adds an instance to the table
function add_ocaml_element(sn, fn, k, t, r, d, l) {
    var x = new OCaml_element(sn, fn, k, t, r, d);
    names_add(sn, x);
    if (sn != fn) {
        names_add(fn, x);
    }
    instances.push(x);
    for (var i = 0; i < l.length; i++) {
        word_add(l[i], x);
    }
}

// Points the opening window to the passed address
function point_to_window(addr) {
    if (addr != '') {
        var wo = window.opener;
        wo.location = addr;
        wo.focus();
    }
}

// Points the main frame to the passed address
function point_to_frame(addr) {
    if (addr != '') {
        var f = parent.frames[1];
        f.location = addr;
    }
}

// Formats a result entry
function format(where, addr, name, alt, type, doc) {
    var action = where == 'window'
        ? "javascript:point_to_window('" + addr + "');"
        : "javascript:point_to_frame('" + addr + "');";
    return '<tt><a href="#" onclick="' + action + '" alt="' + alt + '">'
        + name
        + '</a>: ' + type + '</tt><br/>\n'
        + '<div class="argot_result">' + doc + '</div><br/>\n';
}

// Sets the result into the HTML page
function set_result(where, res) {
    res.sort(compare);
    var text = '';
    var len = res.length;
    for (var i = 0; i < len; i++) {
        var elem = res[i];
        text += format(where,
                       elem.reference,
                       elem.full_name,
                       elem.kind,
                       elem.type.type_as_string,
                       elem.documentation);
    }
    document.getElementById("results").innerHTML = text;
}

// Performs a search by exact name
function search_by_name(where, query) {
    var res = new Array();
    set_result(where, res);
    var elems = names[query];
    if (elems) {
        var len = elems.length;
        for (var i = 0; i < len; i++) {
            res.push(elems[i]);
        }
    }
    set_result(where, res);
}

// Performs a search by regular expression match
function search_by_regexp(where, query) {
    var res = new Array();
    set_result(where, res);
    var regexp = new RegExp('^' + query + '$', 'g');
    var len = instances.length;
    for (var i = 0; i < len; i++) {
        var inst = instances[i];
        var match = regexp.test(inst.short_name) || regexp.test(inst.full_name);
        if (match) {
            res.push(inst);
        }
    }
    set_result(where, res);
}

// Performs a search by type match
function search_by_type(where, query) {
    var res = new Array();
    set_result(where, res);
    var len = instances.length;
    var patt = new OCaml_type(query);
    for (var i = 0; i < len; i++) {
        var inst = instances[i];
        if (same_type(patt, inst.type)) {
            res.push(inst);
        }
    }
    set_result(where, res);
}

// Performs a search by type match (using manifest)
function search_by_type_manifest(where, query) {
    var res = new Array();
    set_result(where, res);
    var len = instances.length;
    var patt = new OCaml_type(query);
    for (var i = 0; i < len; i++) {
        var inst = instances[i];
        if (same_type_manifest(patt, inst.type)) {
            res.push(inst);
        }
    }
    set_result(where, res);
}

// Performs a search by word, storing result in 'dest'
function search_by_word(dest, w) {
   var elems = words[w.toUpperCase()];
    if (elems) {
        var len = elems.length;
        for (var i = 0; i < len; i++) {
            dest.push(elems[i]);
        }
    }
 }

// computes the intersection of two arrays
function intersect(arr1, arr2) {
    var len1 = arr1.length;
    var len2 = arr2.length;
    var res = new Array();
    for (var i = 0; i < len1; i++) {
        var j = 0;
        while ((j < len2) && (arr2[j] != arr1[i])) j++;
        if (j < len2) {
            res.push(arr1[i]);
        }
    }
    return res;
}

// Performs a search by fulltext
function search_by_fulltext(where, query) {
    var res = new Array();
    set_result(where, res);
    var query_list = query.split(' ');
    var query_length = query_list.length;
    if (query_length > 0) {
        search_by_word(res, query_list[0]);
        for (var i = 1; i < query_length; i++) {
            if (query_list[i] != "") {
                var tmp = new Array();
                search_by_word(tmp, query_list[i]);
                res = intersect(res, tmp);
            }
        }
    }
    set_result(where, res);
}

// Actually executes a query
function exec_query(where) {
    var f = document.form;
    var q = f.query.value;
    if (q != '') {
        if (f.mode[0].checked) {
            search_by_name(where, q);
        } else if (f.mode[1].checked) {
            search_by_regexp(where, q);
        } else if (f.mode[2].checked) {
            search_by_type(where, q);
        } else if (f.mode[3].checked) {
            search_by_type_manifest(where, q);
        } else if (f.mode[4].checked) {
            search_by_fulltext(where, q);
        } else {
            alert('internal error');
        }
    }
}
