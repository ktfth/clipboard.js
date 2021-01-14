import ClipboardAction from './clipboard-action';
import Emitter from 'tiny-emitter';
import listen from 'good-listener';

/**
 * Resolve options of the clipboard
 */
class Resolver {
  /**
   * @param {Object} options
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Verify options action
   * @param {Function} defaultAction
   */
  action(defaultAction) {
    return (typeof this.options.action === 'function') ? this.options.action : defaultAction;
  }

  /**
   * Verify options target
   * @param {Function} defaultTarget
   */
  target(defaultTarget) {
    return (typeof this.options.target === 'function') ? this.options.target : defaultTarget;
  }

  /**
   * Verify options text
   * @param {Function} defaultText
   */
  text(defaultText) {
    return (typeof this.options.text === 'function') ? this.options.text : defaultText;
  }

  /**
   * @param {Element} element
   */
  container(element) {
    return (typeof this.options.container === 'object') ? this.options.container : element;
  }
}

/**
 * Base class which takes one or more elements, adds event listeners to them,
 * and instantiates a new `ClipboardAction` on each click.
 */
class Clipboard extends Emitter {
    /**
     * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
     * @param {Object} options
     */
    constructor(trigger, options = {}) {
        super();

        this.resolveOptions(options);
        if (options.type === undefined) {
          options.type = 'click';
        } if (options.cb === undefined) {
          options.cb = (e, final) => { final(); };
        }
        this.listen(trigger, options.type, options.cb);
    }

    /**
     * Defines if attributes would be resolved using internal setter functions
     * or custom functions that were passed in the constructor.
     * @param {Object} options
     */
    resolveOptions(options = {}) {
        let resolver = new Resolver(options);

        this.action = resolver.action(this.defaultAction);
        this.target = resolver.target(this.defaultTarget);
        this.text = resolver.text(this.defaultText);
        this.container = resolver.container(document.body);
    }

    /**
     * Adds a type event listener to the passed trigger
     * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
     * @param {String} type
     * @param {Function} cb
     */
    listen(trigger, type, cb = (e, final) => { final(); }) {
      this.listener = listen(trigger, type, (e) => {
        cb(e, () => {
          this.on(e);
        });
      });
    }

    /**
     * Defines a new `ClipboardAction` on each type event
     * @param {Event} e
     */
    on(e) {
      const trigger = e.delegateTarget || e.currentTarget;

      if (this.clipboardAction) {
          this.clipboardAction = null;
      }

      this.clipboardAction = new ClipboardAction({
          action    : this.action(trigger),
          target    : this.target(trigger),
          text      : this.text(trigger),
          container : this.container,
          trigger   : trigger,
          emitter   : this
      });
    }

    /**
     * Default `action` lookup function.
     * @param {Element} trigger
     */
    defaultAction(trigger) {
        return getAttributeValue('action', trigger);
    }

    /**
     * Default `target` lookup function.
     * @param {Element} trigger
     */
    defaultTarget(trigger) {
        const selector = getAttributeValue('target', trigger);

        if (selector) {
            return document.querySelector(selector);
        }
    }

    /**
     * Returns the support of the given action, or all actions if no action is
     * given.
     * @param {String} [action]
     */
    static isSupported(action = ['copy', 'cut']) {
        const actions = (typeof action === 'string') ? [action] : action;
        let support = !!document.queryCommandSupported;

        actions.forEach((action) => {
            support = support && !!document.queryCommandSupported(action);
        });

        return support;
    }

    /**
     * Default `text` lookup function.
     * @param {Element} trigger
     */
    defaultText(trigger) {
        return getAttributeValue('text', trigger);
    }

    /**
     * Destroy lifecycle.
     */
    destroy() {
        this.listener.destroy();

        if (this.clipboardAction) {
            this.clipboardAction.destroy();
            this.clipboardAction = null;
        }
    }
}


/**
 * Helper function to retrieve attribute value.
 * @param {String} suffix
 * @param {Element} element
 */
function getAttributeValue(suffix, element) {
    const attribute = `data-clipboard-${suffix}`;

    if (!element.hasAttribute(attribute)) {
        return;
    }

    return element.getAttribute(attribute);
}

export default Clipboard;
