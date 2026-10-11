/* Small runtime for the pages that keep state (tabs, quiz cards, checklists).
   A page supplies a <template id="dc-template"> and a `class Component extends DCLogic`
   whose renderVals() returns the values the template's {{holes}} read. */
class DCLogic {
  constructor(props) {
    this.props = props || {};
    this.state = {};
  }
  setState(patch) {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = Object.assign({}, this.state, next);
    if (this._render) this._render();
  }
  forceUpdate() {
    if (this._render) this._render();
  }
}

(function () {
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scopes) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    const parts = path.split('.');
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      if (scope != null && parts[0] in scope) {
        let v = scope;
        for (const p of parts) {
          if (v == null) return undefined;
          v = v[p];
        }
        return v;
      }
    }
    return undefined;
  }

  function fill(text, scopes) {
    return text.replace(HOLE, (_, path) => {
      const v = lookup(path, scopes);
      return v == null ? '' : String(v);
    });
  }

  function build(node, scopes, out) {
    if (node.nodeType === 3) {
      const text = node.nodeValue;
      out.push(document.createTextNode(text.indexOf('{{') >= 0 ? fill(text, scopes) : text));
      return;
    }
    if (node.nodeType !== 1) return;

    if (node.localName === 'sc-if') {
      const m = WHOLE.exec(node.getAttribute('value') || '');
      if (m && lookup(m[1], scopes)) node.childNodes.forEach((c) => build(c, scopes, out));
      return;
    }
    if (node.localName === 'sc-for') {
      const m = WHOLE.exec(node.getAttribute('list') || '');
      const list = m ? lookup(m[1], scopes) : null;
      const as = node.getAttribute('as') || 'item';
      (Array.isArray(list) ? list : []).forEach((item, i) => {
        const scope = { $index: i };
        scope[as] = item;
        const inner = scopes.concat([scope]);
        node.childNodes.forEach((c) => build(c, inner, out));
      });
      return;
    }

    const el = node.cloneNode(false);
    for (const attr of Array.from(node.attributes)) {
      if (attr.value.indexOf('{{') < 0) continue;
      const whole = WHOLE.exec(attr.value);
      if (whole && attr.name.slice(0, 2) === 'on') {
        el.removeAttribute(attr.name);
        const fn = lookup(whole[1], scopes);
        if (typeof fn === 'function') el.addEventListener(attr.name.slice(2), fn);
      } else if (whole) {
        const v = lookup(whole[1], scopes);
        if (v === false || v == null) el.removeAttribute(attr.name);
        else el.setAttribute(attr.name, v === true ? '' : String(v));
      } else {
        el.setAttribute(attr.name, fill(attr.value, scopes));
      }
    }
    const kids = [];
    node.childNodes.forEach((c) => build(c, scopes, kids));
    kids.forEach((k) => el.appendChild(k));
    out.push(el);
  }

  function pathTo(el, root) {
    const path = [];
    while (el && el !== root) {
      const parent = el.parentNode;
      if (!parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.childNodes, el));
      el = parent;
    }
    return el === root ? path : null;
  }

  function mount(Component) {
    const root = document.getElementById('dc-root');
    const template = document.getElementById('dc-template').content;
    const instance = new Component({});

    instance._render = function () {
      // keep keyboard focus on the control that was just used
      const active = document.activeElement;
      const focusPath = active && root.contains(active) ? pathTo(active, root) : null;

      const out = [];
      const vals = instance.renderVals ? instance.renderVals() : {};
      template.childNodes.forEach((c) => build(c, [vals], out));
      root.replaceChildren.apply(root, out);

      if (focusPath) {
        let node = root;
        for (const i of focusPath) node = node && node.childNodes[i];
        if (node && typeof node.focus === 'function') node.focus({ preventScroll: true });
      }
    };

    instance._render();
    if (typeof instance.componentDidMount === 'function') instance.componentDidMount();

    // the content did not exist when the browser first looked for #anchors
    if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView();
    }
  }

  window.DCLite = { mount: mount };
})();
