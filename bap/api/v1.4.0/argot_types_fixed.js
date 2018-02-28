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

// Tags for elements
var KIND_PRODUCT = 0;
var KIND_ARROW = 1;
var KIND_TYPE_LIST = 2;
var KIND_TYPE_APP = 3;
var KIND_VAR = 4;
var KIND_IDENT = 5;
var KIND_FLATTENED_PRODUCT = 6;
var KIND_FLATTENED_ARROW = 7;
var KIND_OPTIONAL_PARAMETER = 8;

// Constructs a product from the passed elements
function product(x, y) {
    var res = [x, y];
    res.kind = KIND_PRODUCT;
    return res;
}

// Constructs an arrow from the passed elements
function arrow(x, y) {
    var res = [x, y];
    res.kind = KIND_ARROW;
    return res;
}

// Returns the kind of a given value
function kind(x) {
    if (x instanceof Array) {
        return x.kind;
    } else {
        return (x[0] == "'") ? KIND_VAR : KIND_IDENT;
    }
}

// Tests whether the passed type is 'unit'
function is_unit(t) {
    return (kind(t) == KIND_IDENT) && (t == 'unit');
}

// Tests whether the second element is part of the first one
function mem(arr, x) {
    var len = arr.length;
    var i = 0;
    while ((i < len) && (arr[i] != x)) {
        i++;
    }
    return (i < len);
}

// Returns the set of variables occurring in the passed type
function get_variables(x) {
    if (x instanceof Array) {
        var res = new Array();
        var len = x.length;
        for (var i = 0; i < len; i++) {
            var elems = get_variables(x[i]);
            var nb = elems.length;
            for (var j = 0; j < nb; j++) {
                if (!mem(res ,elems[j])) {
                    res.push(elems[j]);
                }
            }
        }
        return res;
    } else if (x[0] == "'") {
        return [x];
    } else {
        return [];
    }
}

// Returns the separator corresponding to the passed kind
function separator_of_kind(k) {
    switch (k) {
    case KIND_PRODUCT:
        return ' * ';
    case KIND_ARROW:
        return ' -> ';
    case KIND_TYPE_LIST:
        return ', ';
    case KIND_TYPE_APP:
        return ' ';
    case KIND_FLATTENED_PRODUCT:
        return ' & ';
    case KIND_FLATTENED_ARROW:
        return ' => ';
    default:
        return ' ';
    }
}

// Converts the passed type into a string
function string_of_type(t) {
    if (t instanceof Array) {
        var sep = separator_of_kind(kind(t));
        var res = kind(t) == KIND_OPTIONAL_PARAMETER ? "[" : "(";
        for (var i = 0; i < t.length; i++) {
            if (i > 0) res += sep;
            res += string_of_type(t[i]);
        }
        return res + (kind(t) == KIND_OPTIONAL_PARAMETER ? "]" : ")");
    } else {
        return t + "";
    }
}

// Rewrites the passed (top) type
function rewrite_type_top(t) {
    switch (t.kind) {
    case KIND_PRODUCT:
    case KIND_ARROW:
        var p = [rewrite_type_top(t[0]), rewrite_type_top(t[1])];
        p.kind = t.kind;
        return rewrite_type_inner(p);
    default:
        return t;
    }
}

// Rewrites the passed (inner) type
function rewrite_type_inner(t) {
    switch (kind(t)) {
    case KIND_ARROW:
        if (is_unit(t[0])) { // r7
            return t[1];
        } else if (kind(t[0]) == KIND_PRODUCT) { // r2
            var arr = arrow(t[0][1], t[1]);
            var res = arrow(t[0][0], rewrite_type_inner(arr));
            return rewrite_type_inner(res);
        } else if (kind(t[1]) == KIND_PRODUCT) { // r3
            var left = arrow(t[0], t[1][0]);
            var right = arrow(t[0], t[1][1]);
            return product(rewrite_type_inner(left), rewrite_type_inner(right));
        } else {
            return t;
        }
    case KIND_PRODUCT:
        if (is_unit(t[0])) { // r5
            return t[1];
        } else if (is_unit(t[1])) { // r4
            return t[0];
        } else {
            return t;
        }
    default:
        return t;
    }
}

// Flattens type 't' of a given kind 'k'
function flatten(t, k) {
    if (kind(t) == k) {
        var left = flatten(t[0], k);
        var right = flatten(t[1], k);
        return left.concat(right);
    } else {
        return [t];
    }
}

// Returns the normal form of the passed type
function normalize(t) {
    var nf = rewrite_type_top(t);
    var res = flatten(nf, KIND_PRODUCT);
    var len = res.length;
    for (var i = 0; i < len; i++) {
        res[i] = flatten(res[i], KIND_ARROW);
        res[i].kind = KIND_FLATTENED_ARROW;
    }
    res.kind = KIND_FLATTENED_PRODUCT;
    return res;
}

// Returns the list (as an array) from 0 (inclusive) to 'n' (exclusive)
function integers(n) {
    var res = new Array();
    for (var i = 0; i < n; i++) {
        res.push(i);
    }
    return res;
}

// Helper function for permutations generation
function permuts(tmp, l, res) {
    var len = l.length;
    if (len == 0) {
        res.push(tmp.concat([]));
    }
    for (var i = 0; i < len; i++) {
        var x = l.splice(i, 1);
        tmp.push(x);
        permuts(tmp, l, res);
        tmp.pop();
        l.splice(i, 0, x);
    }
}

// Returns the permutations from 0 (inclusive) to 'n' (exclusive)
function permutations(n) {
    var res = new Array();
    permuts([], integers(n), res);
    return res;
}

// Test whether a variable is bound in a substitution
function is_bound(subst, v) {
    return subst[v] != undefined;
}

// Binds a variable to another one
function bind(subst, v1, v2) {
    var val = subst[v1];
    if (subst[v1] && (val != v2)) {
        throw "Already bound";
    } else {
        for (attr in subst) {
            if ((subst[attr] == v2) && (attr != v1)) {
                throw "Already bound";
            }
        }
        subst[v1] = v2;
    }
}

// Copy a substitution
function copy_subst(subst) {
    var res = new Object();
    for (var attr in subst) {
        res[attr] = subst[attr];
    }
    return res;
}

// Compares two elements (KIND_TYPE_LIST, KIND_TYPE_APP, KIND_VAR, KIND_IDENT)
function equal_element(subst, e1, e2) {
    if ((e1 instanceof Array) && (e2 instanceof Array)) {
        var len = e1.length;
        if (len == e2.length) {
            var i = 0;
            while ((i < len) && (equal_element(subst, e1[i], e2[i]))) {
                i++;
            }
            return (i == len);
        } else {
            return false;
        }
    } else if ((kind(e1) == KIND_VAR) && (kind(e2) == KIND_VAR)) {
        bind(subst, e1, e2);
        return true;
    } else {
        return e1 == e2;
    }
}

// Compares two coordinates (KIND_FLATTENED_ARROW)
function equal_coordinate(c1, c2) {
    var len = c1.length;
    if (len == c2.length) {
        if (len == 0) return true;
        var subst = new Object();
        try {
            if (!equal_element(subst, c1[len - 1], c2[len - 1])) return false;
        } catch (e) {
            return false;
        }
        if (len == 1) return true;
        var p = permutations(len - 1);
        var n = p.length;
        for (var i = 0; i < n; i++) {
            var j = 0;
            var s = copy_subst(subst);
            try {
                while ((j < len - 1) && equal_element(s, c1[j], c2[p[i][j]])) {
                    j++;
                }
                if (j == len - 1) return true;
            } catch (e) {
            }
        }
        return false;
    } else {
        return false;
    }
}

// Compares two types in normal form (KIND_FLATTENED_PRODUCT)
function equal_normal_form(t1, t2) {
    var len = t1.length;
    if (len == t2.length) {
        if (len == 0) return true;
        var p = permutations(len);
        var n = p.length;
        for (var i = 0; i < n; i++) {
            var j = 0;
            while ((j < len) && equal_coordinate(t1[j], t2[p[i][j]])) {
                j++;
            }
            if (j == len) return true;
        }
        return false;
    } else {
        return false;
    }
}

// Counts the number of optional types
function get_optional_count(t) {
    if (t instanceof Array) {
        var k = kind(t);
        if ((k == KIND_OPTIONAL_PARAMETER)) {
            return 1;
        } else {
            var res = 0;
            res.kind = k;
            for (var i = 0; i < t.length; i++) {
                res += get_optional_count(t[i]);
            }
            return res;
        }
    } else {
        return 0;
    }
}

// Computes 2**x
function power2(x) {
    var res = 1;
    for (var i = 0; i < x; i++) {
        res *= 2;
    }
    return res;
}

// Builds the "n"-th signature of a type containing optional types
var nth_signature_aux_id = 0;
function nth_signature_aux(t, n) {
    if (t instanceof Array) {
        if (kind(t) == KIND_OPTIONAL_PARAMETER) {
            var present = (1 << nth_signature_aux_id) & n;
            nth_signature_aux_id++;
            if (present != 0) {
                return t[0];
            } else {
                return null;
            }
        } else {
            var res = new Array();
            for (var i = 0; i < t.length; i++) {
                var tmp = nth_signature_aux(t[i], n);
                if (tmp != null) {
                    res.push(tmp);
                }
            }
            res.kind = kind(t);
            if (res.length == 1) {
                return res[0];
            } else {
                return res;
            }
        }
    } else {
        return t;
    }
}

// Builds the "n"-th signature of a type containing optional types
function nth_signature(t, n) {
    nth_signature_aux_id = 0;
    return nth_signature_aux(t, n);
}

// Global manifest table: mapping from name to manifest information
var manifests = new Object();

// Constructs a manifest for type 'n', declared as 'f' and manifest 't'
function Manifest(n, f, t) {
    this.type_name = n;
    this.type_decl = argot_parser.parse(f);
    this.type_manifest = argot_parser.parse(t);
}

// Records manifest information for type 'n', declared as 'f' and manifest 't'
function add_manifest(n, f, t) {
    try {
        var x = new Manifest(n, f, t);
        manifests[n] = x;
    } catch (e) {
        // manifest is ignored
    }
}

// Rewrites the passed type using the recorded manifests
function rewrite_manifests_aux(t, subst) {
    console.log("rewrite(" + t + "," + subst + ")");
    switch (kind(t)) {
    case KIND_PRODUCT:
    case KIND_ARROW:
    case KIND_FLATTENED_PRODUCT:
    case KIND_FLATTENED_ARROW:
    case KIND_TYPE_LIST: {
        var res = new Array();
        for (var i = 0; i < t.length; i++) {
            res[i] = rewrite_manifests_aux(t[i], subst);
        }
        res.kind = kind(t);
        return res;
    }
    case KIND_TYPE_APP: {
        var res = new Array();
        for (var i = 0; i < t.length - 1; i++) {
            res[i] = rewrite_manifests_aux(t[i], subst);
        }
        res.kind = kind(t);
        var m = manifests[t[t.length - 1]];
        if (m == undefined) {
            res[t.length - 1] = t[t.length - 1];
        } else {
            var new_subst = new Object();
            for (var attr in subst) {
                new_subst[attr] = subst[attr];
            }
            if (m.type_decl[0] instanceof Array) {
                var len = m.type_decl[0].length;
                for (var i = 0; i < len; i++) {
                    new_subst[m.type_decl[0][i]] = t[0][i];
                }
            } else {
                new_subst[m.type_decl[0]] = t[0];
            }
            res[t.length - 1] = rewrite_manifests_aux(m.type_manifest, new_subst);
        }
        return res;
    }
    case KIND_VAR: {
        console.log("rewriting var " + t);
        var u = subst[t];
        if (u == undefined) {
            return t;
        } else {
            return u;
        }
    }
    case KIND_IDENT: {
        console.log("rewriting type ident " + t);
        var m = manifests[t];
        if (m == undefined) {
            console.log("no manifest found");
            return t;
        } else {
            console.log("rewritten to " + m.type_manifest);
            return m.type_manifest;
        }
    }
    default:
        return t;
    }
}

// Rewrites the passed type using the recorded manifests
function rewrite_manifests(t) {
    return rewrite_manifests_aux(t, new Object());
}
