
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.21.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\About.svelte generated by Svelte v3.21.0 */

    const { console: console_1 } = globals;
    const file = "src\\components\\About.svelte";

    // (28:2) {:else}
    function create_else_block(ctx) {
    	let p;
    	let span;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span = element("span");
    			span.textContent = "Hello DarkMode";
    			add_location(span, file, 29, 6, 554);
    			attr_dev(p, "class", "svelte-ced8jc");
    			add_location(p, file, 28, 4, 543);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(28:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if !styles.darkMode}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = `${/*someText*/ ctx[2]}`;
    			attr_dev(p, "class", "svelte-ced8jc");
    			add_location(p, file, 26, 4, 509);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:2) {#if !styles.darkMode}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let t0;
    	let button0;
    	let t1;
    	let t2_value = (/*count*/ ctx[0] === 0 ? "" : /*count*/ ctx[0]) + "";
    	let t2;
    	let t3;
    	let button1;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (!/*styles*/ ctx[1].darkMode) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			t0 = space();
    			button0 = element("button");
    			t1 = text("Click ");
    			t2 = text(t2_value);
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "DarkMode";
    			attr_dev(button0, "role", "button");
    			add_location(button0, file, 33, 2, 606);
    			add_location(button1, file, 36, 2, 706);
    			attr_dev(div, "class", "About");
    			add_location(div, file, 22, 0, 398);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			if_block.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, button0);
    			append_dev(button0, t1);
    			append_dev(button0, t2);
    			append_dev(div, t3);
    			append_dev(div, button1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", /*handleClick*/ ctx[3], false, false, false),
    				listen_dev(button1, "click", /*toggle*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, t0);
    				}
    			}

    			if (dirty & /*count*/ 1 && t2_value !== (t2_value = (/*count*/ ctx[0] === 0 ? "" : /*count*/ ctx[0]) + "")) set_data_dev(t2, t2_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let someText = `Frontend Developer`;
    	let count = 0;
    	let styles = { darkMode: false };

    	function handleClick() {
    		$$invalidate(0, count += 1);
    	}

    	function toggle() {
    		$$invalidate(1, styles.darkMode = !styles.darkMode, styles);
    		console.log(styles.darkMode);
    		window.document.body.classList.toggle("dark-mode");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("About", $$slots, []);

    	$$self.$capture_state = () => ({
    		someText,
    		count,
    		styles,
    		handleClick,
    		toggle
    	});

    	$$self.$inject_state = $$props => {
    		if ("someText" in $$props) $$invalidate(2, someText = $$props.someText);
    		if ("count" in $$props) $$invalidate(0, count = $$props.count);
    		if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [count, styles, someText, handleClick, toggle];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\components\Text.svelte generated by Svelte v3.21.0 */

    const file$1 = "src\\components\\Text.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t = text(/*anotherText*/ ctx[0]);
    			add_location(p, file$1, 5, 2, 94);
    			attr_dev(div, "class", "text");
    			add_location(div, file$1, 4, 0, 72);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*anotherText*/ 1) set_data_dev(t, /*anotherText*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { anotherText = "valor por defecto" } = $$props;
    	const writable_props = ["anotherText"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Text> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Text", $$slots, []);

    	$$self.$set = $$props => {
    		if ("anotherText" in $$props) $$invalidate(0, anotherText = $$props.anotherText);
    	};

    	$$self.$capture_state = () => ({ anotherText });

    	$$self.$inject_state = $$props => {
    		if ("anotherText" in $$props) $$invalidate(0, anotherText = $$props.anotherText);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [anotherText];
    }

    class Text extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { anotherText: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Text",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get anotherText() {
    		throw new Error("<Text>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set anotherText(value) {
    		throw new Error("<Text>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Person.svelte generated by Svelte v3.21.0 */

    const file$2 = "src\\components\\Person.svelte";

    function create_fragment$2(ctx) {
    	let div;
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			t0 = text(/*name*/ ctx[0]);
    			t1 = space();
    			t2 = text(/*lastName*/ ctx[1]);
    			t3 = space();
    			t4 = text(/*country*/ ctx[2]);
    			add_location(p, file$2, 7, 2, 114);
    			attr_dev(div, "class", "Person");
    			add_location(div, file$2, 6, 0, 90);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data_dev(t0, /*name*/ ctx[0]);
    			if (dirty & /*lastName*/ 2) set_data_dev(t2, /*lastName*/ ctx[1]);
    			if (dirty & /*country*/ 4) set_data_dev(t4, /*country*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { lastName } = $$props;
    	let { country } = $$props;
    	const writable_props = ["name", "lastName", "country"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Person> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Person", $$slots, []);

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("lastName" in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ("country" in $$props) $$invalidate(2, country = $$props.country);
    	};

    	$$self.$capture_state = () => ({ name, lastName, country });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("lastName" in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ("country" in $$props) $$invalidate(2, country = $$props.country);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, lastName, country];
    }

    class Person extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0, lastName: 1, country: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Person",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<Person> was created without expected prop 'name'");
    		}

    		if (/*lastName*/ ctx[1] === undefined && !("lastName" in props)) {
    			console.warn("<Person> was created without expected prop 'lastName'");
    		}

    		if (/*country*/ ctx[2] === undefined && !("country" in props)) {
    			console.warn("<Person> was created without expected prop 'country'");
    		}
    	}

    	get name() {
    		throw new Error("<Person>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Person>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastName() {
    		throw new Error("<Person>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastName(value) {
    		throw new Error("<Person>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get country() {
    		throw new Error("<Person>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set country(value) {
    		throw new Error("<Person>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.21.0 */
    const file$3 = "src\\App.svelte";

    function create_fragment$3(ctx) {
    	let main;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let img;
    	let img_src_value;
    	let current;
    	const about = new About({ $$inline: true });

    	const text0 = new Text({
    			props: { anotherText: "Hola!" },
    			$$inline: true
    		});

    	const text1 = new Text({ $$inline: true });
    	const person_spread_levels = [/*data*/ ctx[3]];
    	let person_props = {};

    	for (let i = 0; i < person_spread_levels.length; i += 1) {
    		person_props = assign(person_props, person_spread_levels[i]);
    	}

    	const person = new Person({ props: person_props, $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			t0 = text("Hola ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = space();
    			t3 = text(/*lastName*/ ctx[1]);
    			t4 = text("!");
    			t5 = space();
    			create_component(about.$$.fragment);
    			t6 = space();
    			create_component(text0.$$.fragment);
    			t7 = space();
    			create_component(text1.$$.fragment);
    			t8 = space();
    			create_component(person.$$.fragment);
    			t9 = space();
    			img = element("img");
    			attr_dev(h1, "class", "svelte-b650h3");
    			add_location(h1, file$3, 58, 2, 917);
    			if (img.src !== (img_src_value = /*svelteLogo*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Svelte");
    			attr_dev(img, "class", "svelte-b650h3");
    			add_location(img, file$3, 64, 2, 1116);
    			attr_dev(main, "class", "svelte-b650h3");
    			add_location(main, file$3, 57, 0, 908);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, t0);
    			append_dev(h1, t1);
    			append_dev(h1, t2);
    			append_dev(h1, t3);
    			append_dev(h1, t4);
    			append_dev(main, t5);
    			mount_component(about, main, null);
    			append_dev(main, t6);
    			mount_component(text0, main, null);
    			append_dev(main, t7);
    			mount_component(text1, main, null);
    			append_dev(main, t8);
    			mount_component(person, main, null);
    			append_dev(main, t9);
    			append_dev(main, img);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    			if (!current || dirty & /*lastName*/ 2) set_data_dev(t3, /*lastName*/ ctx[1]);

    			const person_changes = (dirty & /*data*/ 8)
    			? get_spread_update(person_spread_levels, [get_spread_object(/*data*/ ctx[3])])
    			: {};

    			person.$set(person_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(about.$$.fragment, local);
    			transition_in(text0.$$.fragment, local);
    			transition_in(text1.$$.fragment, local);
    			transition_in(person.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(about.$$.fragment, local);
    			transition_out(text0.$$.fragment, local);
    			transition_out(text1.$$.fragment, local);
    			transition_out(person.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(about);
    			destroy_component(text0);
    			destroy_component(text1);
    			destroy_component(person);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { name } = $$props;
    	let { lastName } = $$props;
    	let svelteLogo = "https://arepa.s3.amazonaws.com/svelte-logo.png";

    	const data = {
    		name: "Damián",
    		lastName: "Vigo",
    		country: "Argentina"
    	};

    	const writable_props = ["name", "lastName"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("lastName" in $$props) $$invalidate(1, lastName = $$props.lastName);
    	};

    	$$self.$capture_state = () => ({
    		About,
    		Text,
    		Person,
    		name,
    		lastName,
    		svelteLogo,
    		data
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("lastName" in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ("svelteLogo" in $$props) $$invalidate(2, svelteLogo = $$props.svelteLogo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, lastName, svelteLogo, data];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { name: 0, lastName: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*name*/ ctx[0] === undefined && !("name" in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}

    		if (/*lastName*/ ctx[1] === undefined && !("lastName" in props)) {
    			console.warn("<App> was created without expected prop 'lastName'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastName() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastName(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'Damián',
        lastName: 'Vigo',
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
