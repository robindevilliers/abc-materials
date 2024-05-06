/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/html-format/index.js":
/*!*******************************************!*\
  !*** ./node_modules/html-format/index.js ***!
  \*******************************************/
/***/ ((module) => {

const tagName = String.raw`[A-Za-z][^/\s>]*`;

// Preserve strings in templates and such
// Avoid apostrophes and unintentional captures
const doubleQuotedString = String.raw`(?<!\w)"(?:\\[^<>\n]|[^\\"<>\n])*"(?!\w)`;
const singleQuotedString = String.raw`(?<!\w)'(?:\\[^<>\n]|[^\\'<>\n])*'(?!\w)`;
const quotedString = String.raw`${doubleQuotedString}|${singleQuotedString}`;

const quotedAttrValue = String.raw`"(?<quotedAttrValue>[^"]*)"`;
const singleQuotedAttrValue = String.raw`'(?<singleQuotedAttrValue>[^']*)'`;
// https://mothereff.in/unquoted-attributes
const unquotedAttrValue = String.raw`(?<unquotedAttrValue>[^\s"'\`=<>]+)`;

const attrName = String.raw`[^=\s>/"']+(?=[=>\s]|$)`;
const attrValue = String.raw`${quotedAttrValue}|${singleQuotedAttrValue}|${unquotedAttrValue}`;
const attrNameValue = String.raw`(?<attrName>${attrName})(?:\s*=\s*(?:${attrValue}))?`;

// Make sure not to swallow the closing slash if one exists
const attrText = String.raw`${quotedString}|[^\s>]*[^\s>/]|[^\s>]*/(?!\s*>)`;

const attr = String.raw`(?<attrSpace>\s*)(?:${attrNameValue}|(?<attrText>${attrText}))`;

const tokens = {
  comment: String.raw`<!--.*?-->`,
  dtd: String.raw`<![^>]+>`,
  startTag: String.raw`<(?<startTagName>${tagName})(?<attrs>(?:${attr})*)\s*(?<closingSlash>/?)\s*>`,
  endTag: String.raw`</(?<endTagName>${tagName})\s*>`,
  space: String.raw`\s+`,
  text: String.raw`[^<\s"']+|${quotedString}|['"]`,
  wildcard: String.raw`.`,
};

const grammar = Object.entries(tokens)
  .map(([k, v]) => `(?<${k}>${v})`)
  .join("|");

/**
 *
 * @param {RegExp} lexer
 * @param {string} s
 */
function* getTokens(lexer, s) {
  let res;
  let { lastIndex } = lexer;
  while ((res = lexer.exec(s))) {
    yield /** @type {RegExpExecArray & { groups: Record<string, string> }} */ (
      res
    );
    ({ lastIndex } = lexer);
  }
  if (lastIndex != s.length) throw new Error("Failed to parse string");
}

const voidTags = new Set([
  "area",
  "base",
  "basefont",
  "bgsound",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "image",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function format(/** @type {string} */ html, indent = "  ", width = 80) {
  const lexer = new RegExp(grammar, "gys");
  const attrLexer = new RegExp(attr, "gy");

  /** @type {string[]} */
  const output = [];

  /** @type {string | null} */
  let specialElement = null;
  let level = 0;

  let lineLength = 0;
  let span = "";
  let spanLevel = 0;
  let lastSpace = "";

  const flushOutput = () => {
    if (lastSpace && lastSpace != "\n") {
      const newline = span.indexOf("\n");
      const len = newline == -1 ? span.length : newline;
      if (lineLength + lastSpace.length + len > width) lastSpace = "\n";
    }

    const ind = lastSpace == "\n" && span ? indent.repeat(spanLevel) : "";
    const out = `${lastSpace}${ind}${span}`;

    if (out) {
      const pos = out.lastIndexOf("\n");
      if (pos == -1) lineLength += out.length;
      else lineLength = out.length - pos - 1;
      output.push(out);
    }

    span = lastSpace = "";
  };

  const addOutput = (/** @type {string[]} */ ...args) => {
    for (const s of args) {
      if (!specialElement && /^\s+$/.test(s)) {
        flushOutput();
        lastSpace = s;
      } else {
        if (!span) spanLevel = level;
        span += s;
      }
    }
  };

  for (const token of getTokens(lexer, html)) {
    // For testing
    if (/** @type {any} */ (format).__strict && token.groups.wildcard)
      throw new Error("Unexpected wildcard");

    if (token.groups.endTag) {
      const tagName = token.groups.endTagName.toLowerCase();
      if (tagName == specialElement) specialElement = null;
      if (!specialElement) {
        --level;
        addOutput(`</${tagName}>`);
      }
    }

    if (!specialElement) {
      if (token.groups.space) {
        addOutput(...(token[0].match(/\n/g)?.slice(0, 2) ?? [" "]));
      } else if (
        token.groups.comment ||
        token.groups.dtd ||
        token.groups.text ||
        token.groups.wildcard
      ) {
        addOutput(token[0]);
      } else if (token.groups.startTag) {
        const tagName = token.groups.startTagName.toLowerCase();

        addOutput(`<${tagName}`);

        ++level;

        if (token.groups.attrs) {
          let { lastIndex } = attrLexer;
          let attrToken;
          let lastToken;
          while (
            (attrToken =
              /** @type {RegExpExecArray & { groups: Record<string, string> }} */ (
                attrLexer.exec(token.groups.attrs)
              ))
          ) {
            ({ lastIndex } = attrLexer);

            // For testing
            if (
              /** @type {any} */ (format).__strict &&
              attrToken.groups.attrText
            )
              throw new Error("Unexpected attr text");

            if (attrToken.groups.attrText) {
              if (attrToken.groups.attrSpace)
                addOutput(/\n/.test(attrToken.groups.attrSpace) ? "\n" : " ");
              addOutput(attrToken.groups.attrText);
            } else {
              if (attrToken.groups.attrSpace || !lastToken?.groups.attrText)
                addOutput(/\n/.test(attrToken.groups.attrSpace) ? "\n" : " ");
              addOutput(
                `${attrToken.groups.attrName}${
                  attrToken.groups.quotedAttrValue
                    ? `="${attrToken.groups.quotedAttrValue}"`
                    : attrToken.groups.singleQuotedAttrValue
                    ? `='${attrToken.groups.singleQuotedAttrValue}'`
                    : attrToken.groups.unquotedAttrValue
                    ? `=${attrToken.groups.unquotedAttrValue}`
                    : ""
                }`
              );
            }

            lastToken = attrToken;
          }
          if (lastIndex != token.groups.attrs.length)
            throw new Error("Failed to parse attributes");
        }

        const hasClosingSlash = Boolean(token.groups.closingSlash);

        addOutput(hasClosingSlash ? " />" : ">");

        if (hasClosingSlash || voidTags.has(tagName)) --level;
        else if (["pre", "textarea", "script", "style"].includes(tagName))
          specialElement = tagName;
      }
    } else addOutput(token[0]);
  }

  // Flush remaining output
  flushOutput();

  let newline = false;
  while (/^\s+$/.test(output[output.length - 1])) {
    const last = /** @type {string} */ (output.pop());
    if (/\n/.test(last)) newline = true;
  }

  if (newline) output.push("\n");

  return output.join("");
}

format.default = format;
module.exports = format;


/***/ }),

/***/ "./lib/ClassManager.ts":
/*!*****************************!*\
  !*** ./lib/ClassManager.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
class ClassManager {
    constructor(classMappings) {
        this.classMappings = classMappings;
        this.classes = [];
    }
    toString() {
        const buffer = new StringBuffer_1.StringBuffer();
        let latch = false;
        for (const str of this.classes) {
            const actual = str.trim();
            if (actual.length > 0) {
                if (latch) {
                    buffer.append(" ");
                }
                const substitute = this.classMappings.get(actual);
                if (substitute) {
                    buffer.append(substitute);
                }
                else {
                    buffer.append(actual);
                }
                latch = true;
            }
        }
        return buffer.toString();
    }
    append(value, prefix, def) {
        this.classes.push(value ? prefix + value.trim().toLowerCase() : def);
    }
}
exports["default"] = ClassManager;


/***/ }),

/***/ "./lib/Errors.ts":
/*!***********************!*\
  !*** ./lib/Errors.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FieldError = exports.ObjectError = exports.Errors = void 0;
class Errors {
    constructor(errors = []) {
        this.errors = errors;
    }
    hasErrors() {
        return this.errors.length !== 0;
    }
    getAllErrors() {
        return this.errors;
    }
    getErrorCount() {
        return this.errors.length;
    }
    getGlobalError() {
        return this.errors.find(err => !(err instanceof FieldError));
    }
    getGlobalErrors() {
        return this.errors.filter(err => !(err instanceof FieldError));
    }
    hasGlobalErrors() {
        return this.errors.filter(err => !(err instanceof FieldError)).length !== 0;
    }
    getGlobalErrorsCount() {
        return this.errors.filter(err => !(err instanceof FieldError)).length;
    }
    getFieldError(name) {
        return this.errors.find(err => err instanceof FieldError && (name === undefined || err.getField() === name));
    }
    getFieldErrors(name) {
        return this.errors.filter(err => err instanceof FieldError && (name === undefined || err.getField() === name));
    }
    hasFieldErrors(name) {
        return this.errors.filter(err => err instanceof FieldError && (name === undefined || err.getField() === name)).length !== 0;
    }
    getFieldErrorCount(name) {
        return this.errors.filter(err => err instanceof FieldError && (name === undefined || err.getField() === name)).length;
    }
}
exports.Errors = Errors;
class ObjectError {
    constructor(objectName, defaultMessage) {
        this.objectName = objectName;
        this.defaultMessage = defaultMessage;
    }
    getObjectName() {
        return this.objectName;
    }
    getDefaultMessage() {
        return this.defaultMessage;
    }
}
exports.ObjectError = ObjectError;
class FieldError extends ObjectError {
    constructor(objectName, field, rejectedValue, defaultMessage) {
        super(objectName, defaultMessage);
        this.field = field;
        this.rejectedValue = rejectedValue;
    }
    getField() {
        return this.field;
    }
    getRejectedValue() {
        return this.rejectedValue;
    }
}
exports.FieldError = FieldError;


/***/ }),

/***/ "./lib/RenderingEngine.ts":
/*!********************************!*\
  !*** ./lib/RenderingEngine.ts ***!
  \********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ./parser */ "./lib/parser.ts");
const generate_id_1 = __importDefault(__webpack_require__(/*! ./utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const bindings_1 = __webpack_require__(/*! ./bindings */ "./lib/bindings/index.ts");
const FreemarkerError_1 = __webpack_require__(/*! ./freemarker/FreemarkerError */ "./lib/freemarker/FreemarkerError.ts");
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
const node_path_1 = __importDefault(__webpack_require__(/*! node:path */ "node:path"));
const freemarker_1 = __webpack_require__(/*! ./freemarker */ "./lib/freemarker.ts");
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
class RenderingEngine {
    constructor(file, classMappings, substitutions, dir) {
        this.file = file;
        this.classMappings = classMappings;
        this.substitutions = substitutions;
        this.dir = dir;
    }
    renderElement(element, parent) {
        if (!element.attributes.id) {
            element.attributes.id = (0, generate_id_1.default)();
        }
        const binder = (0, bindings_1.findBinder)(element.name);
        if (binder === undefined) {
            throw new FreemarkerError_1.FreemarkerError("No binding found for " + element.name);
        }
        return binder.render(element, this.classMappings, this, this.substitutions, parent);
    }
    renderChildren(element) {
        const content = new StringBuffer_1.StringBuffer();
        element.children.forEach(child => {
            if ((0, parser_1.isText)(child)) {
                content.append(child.text);
            }
            else if ((0, parser_1.isElement)(child)) {
                content.append(this.renderElement(child, element));
            }
        });
        return content.toString();
    }
    render(templateName, data) {
        const template = fs_1.default.readFileSync(node_path_1.default.join(process.env.INIT_CWD, this.dir, 'partials', templateName), 'utf8');
        try {
            return new freemarker_1.TemplateEngine().render(template, data);
        }
        catch (err) {
            throw new FreemarkerError_1.FreemarkerError(`Error processing ftl template '${templateName}'`, err);
        }
    }
}
exports["default"] = RenderingEngine;


/***/ }),

/***/ "./lib/bindings/AccordionBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/AccordionBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class AccordionBinder {
    accept(name) {
        return name === 'accordion';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.flush = element.attributes.flush === "true";
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('accordion.ftl', data);
    }
}
exports["default"] = AccordionBinder;


/***/ }),

/***/ "./lib/bindings/AccordionItemBinder.ts":
/*!*********************************************!*\
  !*** ./lib/bindings/AccordionItemBinder.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const StringBuffer_1 = __webpack_require__(/*! ../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class AccordionItemBinder {
    accept(name) {
        return name === 'accordion-item';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = element.attributes.id;
        data.active = element.attributes.active === "true";
        data.singleActive = (parent === null || parent === void 0 ? void 0 : parent.attributes.singleActive) === "true";
        data.accordionId = parent === null || parent === void 0 ? void 0 : parent.attributes.id;
        data.size = element.attributes.size;
        const output = new StringBuffer_1.StringBuffer();
        element.children.forEach(child => {
            if ((0, parser_1.isText)(child)) {
                output.append(child.text);
            }
            else if ((0, parser_1.isElement)(child)) {
                if (child.name === 'accordion-item-header') {
                    data.header = renderingEngine.renderElement(child, element);
                }
                else {
                    output.append(renderingEngine.renderElement(child, element));
                }
            }
        });
        data.content = output.toString();
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.backgroundFlavour, 'bg-', '');
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('accordion-item.ftl', data);
    }
}
exports["default"] = AccordionItemBinder;


/***/ }),

/***/ "./lib/bindings/AccordionItemHeaderBinder.ts":
/*!***************************************************!*\
  !*** ./lib/bindings/AccordionItemHeaderBinder.ts ***!
  \***************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class AccordionItemHeaderBinder {
    accept(name) {
        return name === 'accordion-item-header';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = parent.attributes.id;
        data.active = (parent === null || parent === void 0 ? void 0 : parent.attributes.active) === "true";
        data.size = element.attributes.size;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        return renderingEngine.render('accordion-item-header.ftl', data);
    }
}
exports["default"] = AccordionItemHeaderBinder;


/***/ }),

/***/ "./lib/bindings/BackLinkBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/BackLinkBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class BackLinkBinder {
    accept(name) {
        return name === 'back-link';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.backLinkOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('back-link.ftl', data);
    }
}
exports["default"] = BackLinkBinder;


/***/ }),

/***/ "./lib/bindings/BadgeBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/BadgeBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class BadgeBinder {
    accept(name) {
        return name === 'badge';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.size = element.attributes.size;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'badge-', 'badge-default');
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('badge.ftl', data);
    }
}
exports["default"] = BadgeBinder;


/***/ }),

/***/ "./lib/bindings/BrBinder.ts":
/*!**********************************!*\
  !*** ./lib/bindings/BrBinder.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class BrBinder {
    accept(name) {
        return name === 'br';
    }
    render(element, classMappings, renderingEngine) {
        return renderingEngine.render('br.ftl', {});
    }
}
exports["default"] = BrBinder;


/***/ }),

/***/ "./lib/bindings/ButtonBinder.ts":
/*!**************************************!*\
  !*** ./lib/bindings/ButtonBinder.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ButtonBinder {
    accept(name) {
        return name === 'button';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.size = element.attributes.size;
        data.disabled = null;
        data.content = renderingEngine.renderChildren(element);
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.name = "_NAME_";
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.size, 'btn-', '');
        classManager.append(element.attributes.buttonFlavour, 'btn-', 'btn-default');
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('button.ftl', data);
    }
}
exports["default"] = ButtonBinder;


/***/ }),

/***/ "./lib/bindings/CardBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/CardBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const StringBuffer_1 = __webpack_require__(/*! ../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CardBinder {
    accept(name) {
        return name === 'card';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.isLink = !!element.attributes.link;
        const preserveLink = element.attributes.preserveLink === "true";
        data.link = preserveLink ? '/' + element.attributes.view : 'javascript:alert(&quot;link was clicked&quot;); event.preventDefault();';
        data.rel = '';
        data.target = '';
        const output = new StringBuffer_1.StringBuffer();
        element.children.forEach(child => {
            if ((0, parser_1.isText)(child)) {
                output.append(child.text);
            }
            else if ((0, parser_1.isElement)(child)) {
                if (child.name === 'card-header') {
                    data.headerContent = renderingEngine.renderElement(child, element);
                }
                else if (child.name === 'image') {
                    data.imageContent = renderingEngine.renderElement(child, element);
                }
                else if (child.name === 'card-body') {
                    data.bodyContent = renderingEngine.renderElement(child, element);
                }
                else if (child.name === 'card-footer') {
                    data.footerContent = renderingEngine.renderElement(child, element);
                }
            }
        });
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'card-', 'card-default');
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('card.ftl', data);
    }
}
exports["default"] = CardBinder;


/***/ }),

/***/ "./lib/bindings/CardBodyBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/CardBodyBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CardBodyBinder {
    accept(name) {
        return name === 'card-body';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('card-body.ftl', data);
    }
}
exports["default"] = CardBodyBinder;


/***/ }),

/***/ "./lib/bindings/CardFooterBinder.ts":
/*!******************************************!*\
  !*** ./lib/bindings/CardFooterBinder.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CardFooterBinder {
    accept(name) {
        return name === 'card-footer';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('card-footer.ftl', data);
    }
}
exports["default"] = CardFooterBinder;


/***/ }),

/***/ "./lib/bindings/CardHeaderBinder.ts":
/*!******************************************!*\
  !*** ./lib/bindings/CardHeaderBinder.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CardHeaderBinder {
    accept(name) {
        return name === 'card-header';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('card-header.ftl', data);
    }
}
exports["default"] = CardHeaderBinder;


/***/ }),

/***/ "./lib/bindings/CarouselBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/CarouselBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CarouselBinder {
    accept(name) {
        return name === 'carousel';
    }
    render(element, classMappings, renderingEngine) {
        const panels = element.children.filter(el => (0, parser_1.isElement)(el))
            .map(el => el)
            .filter(el => el.name === 'carousel-panel');
        let activeIndex = panels.findIndex(el => el.attributes.active === "true");
        if (activeIndex === -1 && panels.length) {
            panels[0].attributes.active = "true";
            activeIndex = 0;
        }
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        data.autoSlide = element.attributes.autoSlide === "true";
        data.controls = element.attributes.controls === "true";
        data.indicators = element.attributes.indicators === "true";
        data.numberOfIndicators = panels.length;
        data.activeIndex = activeIndex || 0;
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('carousel.ftl', data);
    }
}
exports["default"] = CarouselBinder;


/***/ }),

/***/ "./lib/bindings/CarouselPanelBinder.ts":
/*!*********************************************!*\
  !*** ./lib/bindings/CarouselPanelBinder.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CarouselPanelBinder {
    accept(name) {
        return name === 'carousel-panel';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        data.active = element.attributes.active === "true";
        data.interval = element.attributes.interval;
        data.src = "/public/img/" + element.attributes.src;
        data.carouselId = parent === null || parent === void 0 ? void 0 : parent.attributes.id;
        data.imageClasses = classMappings.get("carousel-image");
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('carousel-panel.ftl', data);
    }
}
exports["default"] = CarouselPanelBinder;


/***/ }),

/***/ "./lib/bindings/CellBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/CellBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CellBinder {
    accept(name) {
        return name === 'cell';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('cell.ftl', data);
    }
}
exports["default"] = CellBinder;


/***/ }),

/***/ "./lib/bindings/CloseWorkflowExecutedPanelBinder.ts":
/*!**********************************************************!*\
  !*** ./lib/bindings/CloseWorkflowExecutedPanelBinder.ts ***!
  \**********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const Errors_1 = __webpack_require__(/*! ../Errors */ "./lib/Errors.ts");
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CloseWorkflowExecutedPanelBinder {
    accept(name) {
        return name === 'close-workflow-executed-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.errors = new Errors_1.Errors([
            new Errors_1.FieldError("this", "username", "", "Invalid username supplied")
        ]);
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.workflow = "workflow:1";
        data.principal = "mr_username";
        data.closeOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('close-workflow-executed-panel.ftl', data);
    }
}
exports["default"] = CloseWorkflowExecutedPanelBinder;


/***/ }),

/***/ "./lib/bindings/ColumnBinder.ts":
/*!**************************************!*\
  !*** ./lib/bindings/ColumnBinder.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ColumnBinder {
    accept(name) {
        return name === 'column';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        return renderingEngine.render('column.ftl', data);
    }
}
exports["default"] = ColumnBinder;


/***/ }),

/***/ "./lib/bindings/ConfirmWorkflowPanelBinder.ts":
/*!****************************************************!*\
  !*** ./lib/bindings/ConfirmWorkflowPanelBinder.ts ***!
  \****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const Errors_1 = __webpack_require__(/*! ../Errors */ "./lib/Errors.ts");
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ConfirmWorkflowPanelBinder {
    accept(name) {
        return name === 'confirm-workflow-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.errors = new Errors_1.Errors([
            new Errors_1.FieldError("this", "username", "", "Invalid username supplied")
        ]);
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.workflow = "workflow:1";
        data.principal = "mr_username";
        data.confirmOnclick = "alert('clicked'); event.preventDefault();";
        data.cancelOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('confirm-workflow-panel.ftl', data);
    }
}
exports["default"] = ConfirmWorkflowPanelBinder;


/***/ }),

/***/ "./lib/bindings/ConfirmationPanelBinder.ts":
/*!*************************************************!*\
  !*** ./lib/bindings/ConfirmationPanelBinder.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ConfirmationPanelBinder {
    accept(name) {
        return name === 'confirmation-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.submitOnclick = "alert('clicked'); event.preventDefault();";
        data.cancelOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('confirmation-panel.ftl', data);
    }
}
exports["default"] = ConfirmationPanelBinder;


/***/ }),

/***/ "./lib/bindings/CookieConsentBinder.ts":
/*!*********************************************!*\
  !*** ./lib/bindings/CookieConsentBinder.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class CookieConsentBinder {
    accept(name) {
        return name === 'cookie-consent';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.allowCookiesOnclick = "alert('clicked'); event.preventDefault();";
        data.privacyPolicyOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('cookie-consent.ftl', data);
    }
}
exports["default"] = CookieConsentBinder;


/***/ }),

/***/ "./lib/bindings/DivBinder.ts":
/*!***********************************!*\
  !*** ./lib/bindings/DivBinder.ts ***!
  \***********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class DivBinder {
    accept(name) {
        return name === 'div';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('div.ftl', data);
    }
}
exports["default"] = DivBinder;


/***/ }),

/***/ "./lib/bindings/EmailBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/EmailBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class EmailBinder {
    accept(name) {
        return name === 'email';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('email.ftl', data);
    }
}
exports["default"] = EmailBinder;


/***/ }),

/***/ "./lib/bindings/EmailConfirmationLinkBinder.ts":
/*!*****************************************************!*\
  !*** ./lib/bindings/EmailConfirmationLinkBinder.ts ***!
  \*****************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class EmailConfirmationLinkBinder {
    accept(name) {
        return name === 'email-confirmation-link';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = element.attributes.label;
        data.link = 'javascript:alert(&quot;link was clicked&quot;); event.preventDefault();';
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('email-confirmation-link.ftl', data);
    }
}
exports["default"] = EmailConfirmationLinkBinder;


/***/ }),

/***/ "./lib/bindings/EnumerationInputBinder.ts":
/*!************************************************!*\
  !*** ./lib/bindings/EnumerationInputBinder.ts ***!
  \************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class EnumerationInputBinder {
    accept(name) {
        return name === 'enumeration-input';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = element.attributes.id;
        data.value = "";
        data.disabled = null;
        data.label = element.attributes.label;
        data.type = element.attributes.type;
        data.reference = element.attributes.reference;
        data.size = element.attributes.size;
        data.style = element.attributes.style;
        data.cardinality = element.attributes.cardinality;
        const values = element.children
            .filter(n => (0, parser_1.isElement)(n))
            .map(n => n)
            .filter(n => n.name === 'value');
        if (element.attributes.cardinality === 'MULTIPLE_SELECT') {
            data.value = values
                .filter(n => n.attributes.default === 'true')
                .map(n => n.attributes.key);
        }
        else {
            data.value = values
                .filter(n => n.attributes.default === 'true')
                .map(n => n.attributes.key)
                .find(n => true) || null;
        }
        data.panels = values.find(n => n.attributes.panel === 'true');
        data.values = values.map(value => ({
            key: value.attributes.key,
            label: value.attributes.label,
            panel: renderingEngine.renderElement(value, element)
        }));
        data.error = new Error("some error message");
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('enumeration-input.ftl', data);
    }
}
exports["default"] = EnumerationInputBinder;


/***/ }),

/***/ "./lib/bindings/ErrorSummaryBinder.ts":
/*!********************************************!*\
  !*** ./lib/bindings/ErrorSummaryBinder.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const Errors_1 = __webpack_require__(/*! ../Errors */ "./lib/Errors.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ErrorSummaryBinder {
    accept(name) {
        return name === 'error-summary';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.errors = new Errors_1.Errors();
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('error-summary.ftl', data);
    }
}
exports["default"] = ErrorSummaryBinder;


/***/ }),

/***/ "./lib/bindings/FakeMessageBinder.ts":
/*!*******************************************!*\
  !*** ./lib/bindings/FakeMessageBinder.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const Message_1 = __importDefault(__webpack_require__(/*! ../store/Message */ "./lib/store/Message.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
class FakeMessageBinder {
    accept(name) {
        return name === 'fake-message';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.addMessage(new Message_1.default((0, generate_id_1.default)(), element.attributes.dateTime, (0, generate_id_1.default)(), element.attributes.kaseId, element.attributes.wizardId, element.attributes.workflowId, element.attributes.group, element.attributes.queue, element.attributes.principal, (0, generate_id_1.default)(), new Date().getTime()));
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakeMessageBinder;


/***/ }),

/***/ "./lib/bindings/FakePageBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/FakePageBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const Page_1 = __importDefault(__webpack_require__(/*! ../store/Page */ "./lib/store/Page.ts"));
class FakePageBinder {
    accept(name) {
        return name === 'fake-page';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.addPage(new Page_1.default(element.attributes.name, element.attributes.version, element.attributes.group, element.attributes.title, element.attributes.description));
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakePageBinder;


/***/ }),

/***/ "./lib/bindings/FakeQueue.ts":
/*!***********************************!*\
  !*** ./lib/bindings/FakeQueue.ts ***!
  \***********************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const Queue_1 = __importDefault(__webpack_require__(/*! ../store/Queue */ "./lib/store/Queue.ts"));
class FakeQueueBinder {
    accept(name) {
        return name === 'fake-queue';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.addQueue(new Queue_1.default(element.attributes.name, element.attributes.title, element.attributes.description));
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakeQueueBinder;


/***/ }),

/***/ "./lib/bindings/FakeStoreBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/FakeStoreBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
class FakeStoreBinder {
    accept(name) {
        return name === 'fake-store';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.clear();
        Store_1.default.setTestContext();
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakeStoreBinder;


/***/ }),

/***/ "./lib/bindings/FakeUserBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/FakeUserBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const User_1 = __importDefault(__webpack_require__(/*! ../store/User */ "./lib/store/User.ts"));
class FakeUserBinder {
    accept(name) {
        return name === 'fake-user';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.addUser(new User_1.default(element.attributes.username, element.attributes.title, element.attributes.firstName, element.attributes.lastName, element.attributes.email, element.attributes.contactNumber, element.attributes.dateOfBirth, element.attributes.timezone, element.attributes.groups.split(":").filter(grp => grp.trim().length), element.attributes.userData));
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakeUserBinder;


/***/ }),

/***/ "./lib/bindings/FakeWizardBinder.ts":
/*!******************************************!*\
  !*** ./lib/bindings/FakeWizardBinder.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const Wizard_1 = __importDefault(__webpack_require__(/*! ../store/Wizard */ "./lib/store/Wizard.ts"));
class FakeWizardBinder {
    accept(name) {
        return name === 'fake-wizard';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.addWizard(new Wizard_1.default(element.attributes.name, element.attributes.version, element.attributes.title, element.attributes.description, element.attributes.active === "true", element.attributes.released === "true"));
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakeWizardBinder;


/***/ }),

/***/ "./lib/bindings/FakeWorkflowBinder.ts":
/*!********************************************!*\
  !*** ./lib/bindings/FakeWorkflowBinder.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const Workflow_1 = __importDefault(__webpack_require__(/*! ../store/Workflow */ "./lib/store/Workflow.ts"));
class FakeWorkflowBinder {
    accept(name) {
        return name === 'fake-workflow';
    }
    render(element, classMappings, renderingEngine) {
        Store_1.default.addWorkflow(new Workflow_1.default(element.attributes.name, element.attributes.version, element.attributes.group, element.attributes.title, element.attributes.description));
        return renderingEngine.renderChildren(element);
    }
}
exports["default"] = FakeWorkflowBinder;


/***/ }),

/***/ "./lib/bindings/FormBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/FormBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class FormBinder {
    accept(name) {
        return name === 'form';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('form.ftl', data);
    }
}
exports["default"] = FormBinder;


/***/ }),

/***/ "./lib/bindings/HorizontalRuleBinder.ts":
/*!**********************************************!*\
  !*** ./lib/bindings/HorizontalRuleBinder.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class HorizontalRuleBinder {
    accept(name) {
        return name === 'horizontal-rule';
    }
    render(element, classMappings, renderingEngine) {
        return renderingEngine.render('horizontal-rule.ftl', {});
    }
}
exports["default"] = HorizontalRuleBinder;


/***/ }),

/***/ "./lib/bindings/IconBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/IconBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class IconBinder {
    accept(name) {
        return name === 'icon';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.name = element.attributes.name;
        data.size = element.attributes.size;
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'icon-', 'icon-default');
        classManager.append(element.attributes.size, 'icon-size-', 'icon-size-medium');
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('icon.ftl', data);
    }
}
exports["default"] = IconBinder;


/***/ }),

/***/ "./lib/bindings/ImageBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/ImageBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ImageBinder {
    accept(name) {
        return name === 'image';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.src = "/public/img/" + element.attributes.src;
        data.alt = element.attributes['alt'] || '';
        let imageStyles = '';
        if ('imageHeight' in element.attributes) {
            imageStyles += 'height: ' + element.attributes['imageHeight'] + '; ';
        }
        if ('imageWidth' in element.attributes) {
            imageStyles += 'width: ' + element.attributes['imageWidth'] + '; ';
        }
        if ('padding' in element.attributes) {
            imageStyles += 'padding: ' + element.attributes['padding'] + '; ';
        }
        if ('margin' in element.attributes) {
            imageStyles += 'margin: ' + element.attributes['margin'] + '; ';
        }
        if ('border' in element.attributes) {
            imageStyles += 'border: ' + element.attributes['border'] + '; ';
        }
        if ('borderRadius' in element.attributes) {
            imageStyles += 'border-radius: ' + element.attributes.borderRadius + '; ';
        }
        if ('objectFit' in element.attributes) {
            imageStyles += 'object-fit: ' + element.attributes.objectFit + '; ';
        }
        if ('object-position' in element.attributes) {
            imageStyles += 'object-position: ' + element.attributes.objectPosition + '; ';
        }
        if ('opacity' in element.attributes) {
            imageStyles += 'opacity: ' + element.attributes['opacity'] + '; ';
        }
        if ('background' in element.attributes) {
            imageStyles += 'background: ' + element.attributes['background'] + '; ';
        }
        data.imageStyles = imageStyles;
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('image.ftl', data);
    }
}
exports["default"] = ImageBinder;


/***/ }),

/***/ "./lib/bindings/InitiateWorkflowButtonBinder.ts":
/*!******************************************************!*\
  !*** ./lib/bindings/InitiateWorkflowButtonBinder.ts ***!
  \******************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class InitiateWorkflowButtonBinder {
    accept(name) {
        return name === 'initiate-workflow-button';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.size = element.attributes.size;
        data.disabled = null;
        data.content = renderingEngine.renderChildren(element);
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.showCasePrincipalPicker = element.attributes.showCasePrincipalPicker === "true";
        data.workflow = element.attributes.workflow;
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.buttonFlavour, 'btn-', 'btn-default');
        classManager.append(element.attributes.size, 'btn-', '');
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('initiate-workflow-button.ftl', data);
    }
}
exports["default"] = InitiateWorkflowButtonBinder;


/***/ }),

/***/ "./lib/bindings/InputBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/InputBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class InputBinder {
    accept(name) {
        return name === 'input';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.value = "";
        data.disabled = null;
        data.label = element.attributes.label;
        data.type = element.attributes.type;
        data.reference = element.attributes.reference;
        data.min = element.attributes.min;
        data.max = element.attributes.max;
        data.cols = element.attributes.cols;
        data.rows = element.attributes.rows;
        data.size = element.attributes.size;
        data.maxLength = element.attributes.maxLength;
        data.currencySymbol = element.attributes.inputType === 'CURRENCY' ? '£' : null;
        data.error = new Error("some error message");
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('input.ftl', data);
    }
}
exports["default"] = InputBinder;


/***/ }),

/***/ "./lib/bindings/InsetTextBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/InsetTextBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class InsetTextBinder {
    accept(name) {
        return name === 'inset-text';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'inset-text-', 'inset-text-default');
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('inset-text.ftl', data);
    }
}
exports["default"] = InsetTextBinder;


/***/ }),

/***/ "./lib/bindings/JumbotronBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/JumbotronBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class JumbotronBinder {
    accept(name) {
        return name === 'jumbotron';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('jumbotron.ftl', data);
    }
}
exports["default"] = JumbotronBinder;


/***/ }),

/***/ "./lib/bindings/LinkBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/LinkBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class LinkBinder {
    accept(name) {
        return name === 'link';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        if (Store_1.default.isTestContext()) {
            data.link = 'javascript:alert(&quot;link was clicked&quot;); event.preventDefault();';
        }
        else {
            if (element.attributes.view) {
                data.link = "/" + element.attributes.view;
            }
            else {
                data.link = element.attributes.url;
                data.rel = "noreferrer noopener";
                data.target = element.attributes.openNewWindow ? "_blank" : null;
            }
        }
        return renderingEngine.render('link.ftl', data);
    }
}
exports["default"] = LinkBinder;


/***/ }),

/***/ "./lib/bindings/ListBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/ListBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ListBinder {
    accept(name) {
        return name === 'list';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.listStyle = element.attributes.listStyle || "BULLET";
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('list.ftl', data);
    }
}
exports["default"] = ListBinder;


/***/ }),

/***/ "./lib/bindings/ListItemBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/ListItemBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ListItemBinder {
    accept(name) {
        return name === 'list-item';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.listStyle = element.attributes.listStyle || "BULLET";
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('list-item.ftl', data);
    }
}
exports["default"] = ListItemBinder;


/***/ }),

/***/ "./lib/bindings/LoginPanelBinder.ts":
/*!******************************************!*\
  !*** ./lib/bindings/LoginPanelBinder.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const Errors_1 = __webpack_require__(/*! ../Errors */ "./lib/Errors.ts");
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class LoginPanelBinder {
    accept(name) {
        return name === 'login-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.errors = new Errors_1.Errors([
            new Errors_1.FieldError("this", "username", "", "Invalid username supplied")
        ]);
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.enableRegistration = true;
        data.enablePrivacyPolicyAgreementOnLogin = true;
        data.registerOnclick = "alert('clicked'); event.preventDefault();";
        data.loginOnclick = "alert('clicked'); event.preventDefault();";
        data.forgotPasswordOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('login-panel.ftl', data);
    }
}
exports["default"] = LoginPanelBinder;


/***/ }),

/***/ "./lib/bindings/LoopBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/LoopBinder.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const FreemarkerError_1 = __webpack_require__(/*! ../freemarker/FreemarkerError */ "./lib/freemarker/FreemarkerError.ts");
const StringBuffer_1 = __webpack_require__(/*! ../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
class LoopBinder {
    accept(name) {
        return name === 'loop';
    }
    render(element, classMappings, renderingEngine, substitutions) {
        const output = new StringBuffer_1.StringBuffer();
        if (element.attributes.reference in substitutions) {
            const val = substitutions[element.attributes.reference].value;
            if (!Array.isArray(val)) {
                throw new FreemarkerError_1.FreemarkerError(`Expected array for substitution ${element.attributes.reference}`);
            }
            for (const v of val) {
                substitutions['.'] = { value: v };
                const data = {};
                data.content = renderingEngine.renderChildren(element);
                output.append(renderingEngine.render('loop.ftl', data));
            }
        }
        else {
            throw new FreemarkerError_1.FreemarkerError(`No substitution found for plantain expression ${element.attributes.reference}`);
        }
        return output.toString();
    }
}
exports["default"] = LoopBinder;


/***/ }),

/***/ "./lib/bindings/MenuBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/MenuBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const StringBuffer_1 = __webpack_require__(/*! ../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class MenuBinder {
    accept(name) {
        return name === 'menu';
    }
    render(element, classMappings, renderingEngine) {
        const children = element.children.filter(el => (0, parser_1.isElement)(el)).map(el => el);
        const menuBrand = children.find(el => el.name === 'menu-brand');
        let menuBrandContent = menuBrand ? renderingEngine.renderElement(menuBrand, element) : "";
        const menuItems = children.filter(el => el.name === 'menu-item');
        const content = new StringBuffer_1.StringBuffer();
        for (const child of menuItems) {
            content.append(renderingEngine.renderElement(child, element));
        }
        let expand = "";
        if (element.attributes.axis === 'HORIZONTAL') {
            if (menuItems.length > 5) {
                expand = "navbar-expand-lg";
            }
            else if (menuItems.length > 3) {
                expand = "navbar-expand-md";
            }
            else {
                expand = "navbar-expand-sm";
            }
        }
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        data.menuBrand = menuBrandContent;
        data.axis = element.attributes.axis || 'VERTICAL';
        data.content = content.toString();
        data.expand = expand;
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('menu.ftl', data);
    }
}
exports["default"] = MenuBinder;


/***/ }),

/***/ "./lib/bindings/MenuBrandBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/MenuBrandBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class MenuBrandBinder {
    accept(name) {
        return name === 'menu-brand';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('menu-brand.ftl', data);
    }
}
exports["default"] = MenuBrandBinder;


/***/ }),

/***/ "./lib/bindings/MenuItemBinder.ts":
/*!****************************************!*\
  !*** ./lib/bindings/MenuItemBinder.ts ***!
  \****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class MenuItemBinder {
    accept(name) {
        return name === 'menu-item';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const isInSubMenu = parent.name === "sub-menu";
        if (isInSubMenu) {
            parent.attributes.hasContent = "true";
        }
        const data = {};
        data.content = renderingEngine.renderChildren(element);
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.type = element.attributes.type;
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.disabled = null;
        data.workflow = element.attributes.workflow;
        data.link = "#";
        data.isInSubMenu = isInSubMenu;
        data.showCasePrincipalPicker = element.attributes.showCasePrincipalPicker === "true";
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'text-', 'text-default');
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        return renderingEngine.render('menu-item.ftl', data);
    }
}
exports["default"] = MenuItemBinder;


/***/ }),

/***/ "./lib/bindings/MessageExplorerBinder.ts":
/*!***********************************************!*\
  !*** ./lib/bindings/MessageExplorerBinder.ts ***!
  \***********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class MessageExplorerBinder {
    accept(name) {
        return name === 'message-explorer';
    }
    render(element, classMappings, renderingEngine) {
        const values = Store_1.default.getMessages().map(m => {
            const [wizardName, wizardVersion] = m.getWizardId().split(":");
            const wizard = Store_1.default.getWizards().find(w => w.getName() === wizardName && w.getVersion() === wizardVersion);
            const [workflowGroup, workflowName, workflowVersion] = m.getWorkflowId().split(":");
            const workflow = Store_1.default.getWorkflows().find(w => w.getGroup() === workflowGroup && w.getName() === workflowName && w.getVersion() === workflowVersion);
            return {
                wipId: m.getWipId(),
                wizardId: m.getWizardId(),
                wizardTitle: wizard === null || wizard === void 0 ? void 0 : wizard.getTitle(),
                wizardDescription: wizard === null || wizard === void 0 ? void 0 : wizard.getDescription(),
                workflowId: m.getWorkflowId(),
                workflowTitle: workflow === null || workflow === void 0 ? void 0 : workflow.getTitle(),
                workflowDescription: workflow === null || workflow === void 0 ? void 0 : workflow.getDescription(),
                date: m.getDateTime().substring(0, 10),
                dateTime: m.getDateTime(),
                principal: m.getPrincipal(),
            };
        });
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.bust = (0, generate_id_1.default)();
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.values = values;
        data.wizard = "";
        data.queue = "";
        data.workflow = "";
        data.principal = "";
        data.groups = ["public, authenticated"];
        data.startIndex = "0";
        data.endIndex = String(Number.MAX_VALUE);
        data.workflows = Store_1.default.getWorkflows().map(w => {
            return {
                id: w.getGroup() + ":" + w.getName() + ":" + w.getVersion(),
                title: w.getTitle()
            };
        });
        data.wizards = Store_1.default.getWizards().map(w => {
            return {
                id: w.getName() + ":" + w.getVersion(),
                title: w.getTitle()
            };
        });
        data.queues = Store_1.default.getQueues();
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('message-explorer.ftl', data);
    }
}
exports["default"] = MessageExplorerBinder;


/***/ }),

/***/ "./lib/bindings/MileStoneBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/MileStoneBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class MileStoneBinder {
    accept(name) {
        return name === 'mile-stone';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const stones = parent.children
            .filter(el => (0, parser_1.isElement)(el))
            .map(el => el)
            .filter(el => el.name = "mile-stone");
        const total = stones.length;
        const index = stones.findIndex(el => el === element);
        let tag = "";
        if (parent.attributes.mileStoneStyle === "NUMBERED") {
            tag = "" + (index + 1);
        }
        else if (parent.attributes.mileStoneStyle === "PERCENT") {
            tag = "" + Math.floor(index / total * 100) + "%";
        }
        const data = {};
        data.id = element.attributes.id;
        data.label = element.attributes.label;
        data.active = element.attributes.active === "true";
        data.mileStoneStyle = parent.attributes.mileStoneStyle;
        data.labelSide = parent.attributes.labelSide;
        data.content = renderingEngine.renderChildren(element);
        data.tag = tag;
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.mileStoneStyle, 'milestone-style-', '');
        classManager.append(element.attributes.labelSide, 'label-side-', '');
        data.classes = classManager.toString();
        return renderingEngine.render('mile-stone.ftl', data);
    }
}
exports["default"] = MileStoneBinder;


/***/ }),

/***/ "./lib/bindings/NotificationBannerBinder.ts":
/*!**************************************************!*\
  !*** ./lib/bindings/NotificationBannerBinder.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class NotificationBannerBinder {
    accept(name) {
        return name === 'notification-banner';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.title = element.attributes.title;
        data.flavour = element.attributes.flavour;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'notification-banner-', 'notification-banner-default');
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('notification-banner.ftl', data);
    }
}
exports["default"] = NotificationBannerBinder;


/***/ }),

/***/ "./lib/bindings/PageBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/PageBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class PageBinder {
    accept(name) {
        return name === 'page';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('page.ftl', data);
    }
}
exports["default"] = PageBinder;


/***/ }),

/***/ "./lib/bindings/ParagraphBinder.ts":
/*!*****************************************!*\
  !*** ./lib/bindings/ParagraphBinder.ts ***!
  \*****************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ParagraphBinder {
    accept(name) {
        return name === 'paragraph';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.paragraphStyle = element.attributes.paragraphStyle || 'PLAIN';
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('paragraph.ftl', data);
    }
}
exports["default"] = ParagraphBinder;


/***/ }),

/***/ "./lib/bindings/PasswordResetLinkBinder.ts":
/*!*************************************************!*\
  !*** ./lib/bindings/PasswordResetLinkBinder.ts ***!
  \*************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class PasswordResetLinkBinder {
    accept(name) {
        return name === 'password-reset-link';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = element.attributes.label;
        data.link = 'javascript:alert(&quot;link was clicked&quot;); event.preventDefault();';
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('password-reset-link.ftl', data);
    }
}
exports["default"] = PasswordResetLinkBinder;


/***/ }),

/***/ "./lib/bindings/ProgressBarBinder.ts":
/*!*******************************************!*\
  !*** ./lib/bindings/ProgressBarBinder.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ProgressBarBinder {
    accept(name) {
        return name === 'progress-bar';
    }
    render(element, classMappings, renderingEngine) {
        const milestones = element.children.filter(el => (0, parser_1.isElement)(el))
            .map(el => el)
            .filter(el => el.name === 'mile-stone');
        if (milestones.length) {
            milestones[0].attributes.active = "true";
        }
        const data = {};
        data.id = element.attributes.id;
        data.axis = element.attributes.axis;
        data.size = element.attributes.size;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'progress-bar-', 'progress-bar-default');
        classManager.append(element.attributes.axis, 'progress-bar-axis-', '');
        classManager.append(element.attributes.labelSide, 'progress-bar-label-side-', '');
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('progress-bar.ftl', data);
    }
}
exports["default"] = ProgressBarBinder;


/***/ }),

/***/ "./lib/bindings/RegisterPanelBinder.ts":
/*!*********************************************!*\
  !*** ./lib/bindings/RegisterPanelBinder.ts ***!
  \*********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const Errors_1 = __webpack_require__(/*! ../Errors */ "./lib/Errors.ts");
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class RegisterPanelBinder {
    accept(name) {
        return name === 'register-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.errors = new Errors_1.Errors([]);
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.timezones = [];
        data.nextOnclick = "alert('clicked'); event.preventDefault();";
        data.loginOnclick = "alert('clicked'); event.preventDefault();";
        data.cancelOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('register-panel.ftl', data);
    }
}
exports["default"] = RegisterPanelBinder;


/***/ }),

/***/ "./lib/bindings/ResetPasswordPanelBinder.ts":
/*!**************************************************!*\
  !*** ./lib/bindings/ResetPasswordPanelBinder.ts ***!
  \**************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ResetPasswordPanelBinder {
    accept(name) {
        return name === 'reset-password-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.content = renderingEngine.renderChildren(element);
        data.nextOnclick = "alert('clicked'); event.preventDefault();";
        data.cancelOnclick = "alert('clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('reset-password-panel.ftl', data);
    }
}
exports["default"] = ResetPasswordPanelBinder;


/***/ }),

/***/ "./lib/bindings/ResetPasswordRequestPanelBinder.ts":
/*!*********************************************************!*\
  !*** ./lib/bindings/ResetPasswordRequestPanelBinder.ts ***!
  \*********************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ResetPasswordRequestPanelBinder {
    accept(name) {
        return name === 'reset-password-request-panel';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.content = renderingEngine.renderChildren(element);
        data.nextOnclick = "alert('Next button clicked'); event.preventDefault();";
        data.cancelOnclick = "alert('Cancel button clicked'); event.preventDefault();";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('reset-password-request-panel.ftl', data);
    }
}
exports["default"] = ResetPasswordRequestPanelBinder;


/***/ }),

/***/ "./lib/bindings/RowBinder.ts":
/*!***********************************!*\
  !*** ./lib/bindings/RowBinder.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class RowBinder {
    accept(name) {
        return name === 'row';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        return renderingEngine.render('row.ftl', data);
    }
}
exports["default"] = RowBinder;


/***/ }),

/***/ "./lib/bindings/ScaleBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/ScaleBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ScaleBinder {
    accept(name) {
        return name === 'scale';
    }
    render(element, classMappings, renderingEngine) {
        let values = undefined;
        if (element.attributes.scaleType === 'NUMERICAL') {
            values = [
                { key: "1", label: "1" },
                { key: "2", label: "2" },
                { key: "3", label: "3" },
                { key: "4", label: "4" },
                { key: "5", label: "5" },
                { key: "6", label: "6" },
                { key: "7", label: "7" },
                { key: "8", label: "8" },
                { key: "9", label: "9" },
                { key: "10", label: "10" },
            ];
        }
        else if (element.attributes.scaleType === 'LIKERT') {
            values = [
                { key: "strongly-disagree", label: "Strongly Disagree" },
                { key: "disagree", label: "Disagree" },
                { key: "neutral", label: "Neutral" },
                { key: "agree", label: "Agree" },
                { key: "strongly-agree", label: "Strongly Agree" },
            ];
        }
        else if (element.attributes.scaleType === 'FREQUENCY') {
            values = [
                { key: "never", label: "Never" },
                { key: "rarely", label: "Rarely" },
                { key: "sometimes", label: "Sometimes" },
                { key: "often", label: "Often" },
                { key: "very-often", label: "Very Often" },
            ];
        }
        else if (element.attributes.scaleType === 'DICHOTOMOUS') {
            values = [
                { key: "yes", label: "Yes" },
                { key: "no", label: "No" }
            ];
        }
        else if (element.attributes.scaleType === 'BOOLEAN') {
            values = [
                { key: "true", label: "True" },
                { key: "false", label: "False" }
            ];
        }
        const data = {};
        data.id = element.attributes.id;
        data.disabled = null;
        data.label = element.attributes.label;
        data.scaleType = element.attributes.scaleType;
        data.reference = element.attributes.reference;
        data.size = element.attributes.size;
        data.values = values;
        data.value = "";
        data.error = new Error("some error message");
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('scale.ftl', data);
    }
}
exports["default"] = ScaleBinder;


/***/ }),

/***/ "./lib/bindings/ScriptBinder.ts":
/*!**************************************!*\
  !*** ./lib/bindings/ScriptBinder.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const FreemarkerError_1 = __webpack_require__(/*! ../freemarker/FreemarkerError */ "./lib/freemarker/FreemarkerError.ts");
class SpanBinder {
    accept(name) {
        return name === 'script';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        if (element.attributes.script in substitutions) {
            const val = substitutions[element.attributes.script].value;
            if (typeof val !== "string") {
                throw new FreemarkerError_1.FreemarkerError(`Expected string for substitution ${element.attributes.script}`);
            }
            data.text = val;
        }
        else {
            throw new FreemarkerError_1.FreemarkerError(`No substitution found for plantain expression ${element.attributes.script}`);
        }
        return renderingEngine.render('script.ftl', data);
    }
}
exports["default"] = SpanBinder;


/***/ }),

/***/ "./lib/bindings/SpanBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/SpanBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class SpanBinder {
    accept(name) {
        return name === 'span';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.paragraphStyle = element.attributes.paragraphStyle || 'PLAIN';
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        return renderingEngine.render('span.ftl', data);
    }
}
exports["default"] = SpanBinder;


/***/ }),

/***/ "./lib/bindings/SubMenuBinder.ts":
/*!***************************************!*\
  !*** ./lib/bindings/SubMenuBinder.ts ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const StringBuffer_1 = __webpack_require__(/*! ../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class SubMenuBinder {
    accept(name) {
        return name === 'sub-menu';
    }
    render(element, classMappings, renderingEngine) {
        const children = element.children.filter(el => (0, parser_1.isElement)(el)).map(el => el);
        let label, content = new StringBuffer_1.StringBuffer();
        for (const child of children) {
            if (child.name == 'sub-menu-label') {
                label = renderingEngine.renderElement(child, element);
            }
            else {
                content.append(renderingEngine.renderElement(child, element));
            }
        }
        const data = {};
        data.id = element.attributes.id;
        data.content = content.toString();
        data.hasContent = element.attributes.hasContent === "true";
        data.label = label;
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('sub-menu.ftl', data);
    }
}
exports["default"] = SubMenuBinder;


/***/ }),

/***/ "./lib/bindings/SubMenuLabelBinder.ts":
/*!********************************************!*\
  !*** ./lib/bindings/SubMenuLabelBinder.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class SubMenuLabelBinder {
    accept(name) {
        return name === 'sub-menu-label';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'text-', 'text-default');
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        return renderingEngine.render('sub-menu-label.ftl', data);
    }
}
exports["default"] = SubMenuLabelBinder;


/***/ }),

/***/ "./lib/bindings/SwitchBinder.ts":
/*!**************************************!*\
  !*** ./lib/bindings/SwitchBinder.ts ***!
  \**************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
class SwitchBinder {
    accept(name) {
        return name === 'switch';
    }
    render(element, classMappings, renderingEngine, substitutions) {
        const children = element.children.filter(el => (0, parser_1.isElement)(el)).map(el => el);
        let found = children.find(el => el.name === 'def');
        for (const child of children) {
            if (child.attributes.condition in substitutions && substitutions[child.attributes.condition].value) {
                found = child;
                break;
            }
        }
        if (found) {
            const data = {};
            data.id = element.attributes.id;
            data.content = renderingEngine.renderChildren(found);
            const classManager = new ClassManager_1.default(classMappings);
            (0, flex_item_support_1.default)(data, classManager, element.attributes);
            data.classes = classManager.toString();
            return renderingEngine.render('switch.ftl', data);
        }
        return "";
    }
}
exports["default"] = SwitchBinder;


/***/ }),

/***/ "./lib/bindings/TableBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/TableBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class TableBinder {
    accept(name) {
        return name === 'table';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.size = element.attributes.size;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('table.ftl', data);
    }
}
exports["default"] = TableBinder;


/***/ }),

/***/ "./lib/bindings/TitleBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/TitleBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class TitleBinder {
    accept(name) {
        return name === 'title';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.size = element.attributes.size;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('title.ftl', data);
    }
}
exports["default"] = TitleBinder;


/***/ }),

/***/ "./lib/bindings/ToolTipBinder.ts":
/*!***************************************!*\
  !*** ./lib/bindings/ToolTipBinder.ts ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const StringBuffer_1 = __webpack_require__(/*! ../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ToolTipBinder {
    accept(name) {
        return name === 'tool-tip';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const children = element.children.filter(node => !(0, parser_1.isText)(node));
        if (children.length !== 1) {
            throw new Error("Tool tip element must have only 1 child.");
        }
        const child = children[0];
        element.attributes.alignSelf = child.attributes.alignSelf;
        element.attributes.flexBasis = child.attributes.flexBasis;
        element.attributes.flexGrow = child.attributes.flexGrow;
        element.attributes.flexShrink = child.attributes.flexShrink;
        element.attributes.height = child.attributes.height;
        element.attributes.width = child.attributes.width;
        // element.attributes.padding = child.attributes.padding;
        element.attributes.margin = child.attributes.margin;
        element.attributes.backgroundFlavour = child.attributes.backgroundFlavour;
        element.attributes.borderRadius = child.attributes.borderRadius;
        delete child.attributes.alignSelf;
        delete child.attributes.flexBasis;
        delete child.attributes.flexGrow;
        delete child.attributes.flexShrink;
        delete child.attributes.height;
        delete child.attributes.width;
        delete child.attributes.margin;
        const output = new StringBuffer_1.StringBuffer();
        element.children.forEach(child => {
            if ((0, parser_1.isText)(child)) {
                output.append(child.text);
            }
            else if ((0, parser_1.isElement)(child)) {
                output.append(renderingEngine.renderElement(child, element));
            }
        });
        const data = {};
        data.id = element.attributes.id;
        data.exposition = element.attributes.exposition;
        data.content = output.toString();
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('tool-tip.ftl', data);
    }
}
exports["default"] = ToolTipBinder;


/***/ }),

/***/ "./lib/bindings/TrayBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/TrayBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ../parser */ "./lib/parser.ts");
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class TrayBinder {
    accept(name) {
        return name === 'tray';
    }
    render(element, classMappings, renderingEngine) {
        const children = element.children.filter(el => (0, parser_1.isElement)(el)).map(el => el);
        const trayHeader = children.find(el => el.name === "tray-header");
        const values = Store_1.default.getMessages().map(m => {
            const [wizardName, wizardVersion] = m.getWizardId().split(":");
            const wizard = Store_1.default.getWizards().find(w => w.getName() === wizardName && w.getVersion() === wizardVersion);
            const [workflowGroup, workflowName, workflowVersion] = m.getWorkflowId().split(":");
            const workflow = Store_1.default.getWorkflows().find(w => w.getGroup() === workflowGroup && w.getName() === workflowName && w.getVersion() === workflowVersion);
            return {
                wipId: m.getWipId(),
                wizardId: m.getWizardId(),
                wizardTitle: wizard === null || wizard === void 0 ? void 0 : wizard.getTitle(),
                wizardDescription: wizard === null || wizard === void 0 ? void 0 : wizard.getDescription(),
                workflowId: m.getWorkflowId(),
                workflowTitle: workflow === null || workflow === void 0 ? void 0 : workflow.getTitle(),
                workflowDescription: workflow === null || workflow === void 0 ? void 0 : workflow.getDescription(),
                date: m.getDateTime().substring(0, 10),
                dateTime: m.getDateTime(),
                principal: m.getPrincipal(),
            };
        });
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.trayHeader = trayHeader ? renderingEngine.renderElement(trayHeader, element) : "";
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.values = values;
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('tray.ftl', data);
    }
}
exports["default"] = TrayBinder;


/***/ }),

/***/ "./lib/bindings/TrayHeaderBinder.ts":
/*!******************************************!*\
  !*** ./lib/bindings/TrayHeaderBinder.ts ***!
  \******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const text_style_support_1 = __webpack_require__(/*! ../text-style-support */ "./lib/text-style-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class TrayHeaderBinder {
    accept(name) {
        return name === 'tray-header';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, text_style_support_1.textStyleSupport)(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();
        return renderingEngine.render('tray-header.ftl', data);
    }
}
exports["default"] = TrayHeaderBinder;


/***/ }),

/***/ "./lib/bindings/UserExplorerBinder.ts":
/*!********************************************!*\
  !*** ./lib/bindings/UserExplorerBinder.ts ***!
  \********************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const Store_1 = __importDefault(__webpack_require__(/*! ../store/Store */ "./lib/store/Store.ts"));
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class UserExplorerBinder {
    accept(name) {
        return name === 'user-explorer';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data._csrf = (0, generate_id_1.default)();
        data.bust = (0, generate_id_1.default)();
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.values = Store_1.default.getUsers();
        data.groups = Store_1.default.getGroups();
        data.group = "";
        data.wizard = "";
        data.workflow = "";
        data.queue = "";
        data.principal = "";
        data.username = "";
        data.firstName = "";
        data.lastName = "";
        data.executeWorkflow = "";
        data.messageExplorerMode = false;
        data.startIndex = "startIndex";
        data.endIndex = "endIndex";
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('user-explorer.ftl', data);
    }
}
exports["default"] = UserExplorerBinder;


/***/ }),

/***/ "./lib/bindings/UuidBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/UuidBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const generate_id_1 = __importDefault(__webpack_require__(/*! ../utilities/generate-id */ "./lib/utilities/generate-id.ts"));
class UuidBinder {
    accept(name) {
        return name === 'uuid';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.reference = element.attributes.reference;
        data.value = (0, generate_id_1.default)();
        return renderingEngine.render('uuid.ftl', data);
    }
}
exports["default"] = UuidBinder;


/***/ }),

/***/ "./lib/bindings/ValueBinder.ts":
/*!*************************************!*\
  !*** ./lib/bindings/ValueBinder.ts ***!
  \*************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class ValueBinder {
    accept(name) {
        return name === 'value';
    }
    render(element, classMappings, renderingEngine, substitutions, parent) {
        const data = {};
        data.id = parent.attributes.id;
        data.key = element.attributes.key;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('value-panel.ftl', data);
    }
}
exports["default"] = ValueBinder;


/***/ }),

/***/ "./lib/bindings/WarningBinder.ts":
/*!***************************************!*\
  !*** ./lib/bindings/WarningBinder.ts ***!
  \***************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class WarningBinder {
    accept(name) {
        return name === 'warning';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('warning.ftl', data);
    }
}
exports["default"] = WarningBinder;


/***/ }),

/***/ "./lib/bindings/WellBinder.ts":
/*!************************************!*\
  !*** ./lib/bindings/WellBinder.ts ***!
  \************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const flex_item_support_1 = __importDefault(__webpack_require__(/*! ../flex-item-support */ "./lib/flex-item-support.ts"));
const flex_container_support_1 = __webpack_require__(/*! ../flex-container-support */ "./lib/flex-container-support.ts");
const ClassManager_1 = __importDefault(__webpack_require__(/*! ../ClassManager */ "./lib/ClassManager.ts"));
class WellBinder {
    accept(name) {
        return name === 'well';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.content = renderingEngine.renderChildren(element);
        const classManager = new ClassManager_1.default(classMappings);
        classManager.append(element.attributes.flavour, 'well-', 'well-default');
        (0, flex_item_support_1.default)(data, classManager, element.attributes);
        (0, flex_container_support_1.flexContainerSupport)(data, classManager, element.attributes);
        data.classes = classManager.toString();
        return renderingEngine.render('well.ftl', data);
    }
}
exports["default"] = WellBinder;


/***/ }),

/***/ "./lib/bindings/WizardTestResultsBinder.ts":
/*!*************************************************!*\
  !*** ./lib/bindings/WizardTestResultsBinder.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class WizardTestResultsBinder {
    accept(name) {
        return name === 'wizard-test-results';
    }
    render(element, classMappings, renderingEngine) {
        const data = {};
        data.id = element.attributes.id;
        data.content = "some content";
        return renderingEngine.render('wizard-test-results.ftl', data);
    }
}
exports["default"] = WizardTestResultsBinder;


/***/ }),

/***/ "./lib/bindings/index.ts":
/*!*******************************!*\
  !*** ./lib/bindings/index.ts ***!
  \*******************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.findBinder = void 0;
const TitleBinder_1 = __importDefault(__webpack_require__(/*! ./TitleBinder */ "./lib/bindings/TitleBinder.ts"));
const ParagraphBinder_1 = __importDefault(__webpack_require__(/*! ./ParagraphBinder */ "./lib/bindings/ParagraphBinder.ts"));
const DivBinder_1 = __importDefault(__webpack_require__(/*! ./DivBinder */ "./lib/bindings/DivBinder.ts"));
const LoginPanelBinder_1 = __importDefault(__webpack_require__(/*! ./LoginPanelBinder */ "./lib/bindings/LoginPanelBinder.ts"));
const PageBinder_1 = __importDefault(__webpack_require__(/*! ./PageBinder */ "./lib/bindings/PageBinder.ts"));
const WellBinder_1 = __importDefault(__webpack_require__(/*! ./WellBinder */ "./lib/bindings/WellBinder.ts"));
const UserExplorerBinder_1 = __importDefault(__webpack_require__(/*! ./UserExplorerBinder */ "./lib/bindings/UserExplorerBinder.ts"));
const ImageBinder_1 = __importDefault(__webpack_require__(/*! ./ImageBinder */ "./lib/bindings/ImageBinder.ts"));
const LinkBinder_1 = __importDefault(__webpack_require__(/*! ./LinkBinder */ "./lib/bindings/LinkBinder.ts"));
const BackLinkBinder_1 = __importDefault(__webpack_require__(/*! ./BackLinkBinder */ "./lib/bindings/BackLinkBinder.ts"));
const RegisterPanelBinder_1 = __importDefault(__webpack_require__(/*! ./RegisterPanelBinder */ "./lib/bindings/RegisterPanelBinder.ts"));
const ResetPasswordRequestPanelBinder_1 = __importDefault(__webpack_require__(/*! ./ResetPasswordRequestPanelBinder */ "./lib/bindings/ResetPasswordRequestPanelBinder.ts"));
const ResetPasswordPanelBinder_1 = __importDefault(__webpack_require__(/*! ./ResetPasswordPanelBinder */ "./lib/bindings/ResetPasswordPanelBinder.ts"));
const AccordionItemHeaderBinder_1 = __importDefault(__webpack_require__(/*! ./AccordionItemHeaderBinder */ "./lib/bindings/AccordionItemHeaderBinder.ts"));
const InsetTextBinder_1 = __importDefault(__webpack_require__(/*! ./InsetTextBinder */ "./lib/bindings/InsetTextBinder.ts"));
const AccordionItemBinder_1 = __importDefault(__webpack_require__(/*! ./AccordionItemBinder */ "./lib/bindings/AccordionItemBinder.ts"));
const WarningBinder_1 = __importDefault(__webpack_require__(/*! ./WarningBinder */ "./lib/bindings/WarningBinder.ts"));
const ColumnBinder_1 = __importDefault(__webpack_require__(/*! ./ColumnBinder */ "./lib/bindings/ColumnBinder.ts"));
const RowBinder_1 = __importDefault(__webpack_require__(/*! ./RowBinder */ "./lib/bindings/RowBinder.ts"));
const CellBinder_1 = __importDefault(__webpack_require__(/*! ./CellBinder */ "./lib/bindings/CellBinder.ts"));
const TableBinder_1 = __importDefault(__webpack_require__(/*! ./TableBinder */ "./lib/bindings/TableBinder.ts"));
const BadgeBinder_1 = __importDefault(__webpack_require__(/*! ./BadgeBinder */ "./lib/bindings/BadgeBinder.ts"));
const AccordionBinder_1 = __importDefault(__webpack_require__(/*! ./AccordionBinder */ "./lib/bindings/AccordionBinder.ts"));
const CardHeaderBinder_1 = __importDefault(__webpack_require__(/*! ./CardHeaderBinder */ "./lib/bindings/CardHeaderBinder.ts"));
const CardBodyBinder_1 = __importDefault(__webpack_require__(/*! ./CardBodyBinder */ "./lib/bindings/CardBodyBinder.ts"));
const CardFooterBinder_1 = __importDefault(__webpack_require__(/*! ./CardFooterBinder */ "./lib/bindings/CardFooterBinder.ts"));
const CardBinder_1 = __importDefault(__webpack_require__(/*! ./CardBinder */ "./lib/bindings/CardBinder.ts"));
const IconBinder_1 = __importDefault(__webpack_require__(/*! ./IconBinder */ "./lib/bindings/IconBinder.ts"));
const ToolTipBinder_1 = __importDefault(__webpack_require__(/*! ./ToolTipBinder */ "./lib/bindings/ToolTipBinder.ts"));
const ListItemBinder_1 = __importDefault(__webpack_require__(/*! ./ListItemBinder */ "./lib/bindings/ListItemBinder.ts"));
const ListBinder_1 = __importDefault(__webpack_require__(/*! ./ListBinder */ "./lib/bindings/ListBinder.ts"));
const CookieConsentBinder_1 = __importDefault(__webpack_require__(/*! ./CookieConsentBinder */ "./lib/bindings/CookieConsentBinder.ts"));
const FakeStoreBinder_1 = __importDefault(__webpack_require__(/*! ./FakeStoreBinder */ "./lib/bindings/FakeStoreBinder.ts"));
const ErrorSummaryBinder_1 = __importDefault(__webpack_require__(/*! ./ErrorSummaryBinder */ "./lib/bindings/ErrorSummaryBinder.ts"));
const InputBinder_1 = __importDefault(__webpack_require__(/*! ./InputBinder */ "./lib/bindings/InputBinder.ts"));
const EnumerationInputBinder_1 = __importDefault(__webpack_require__(/*! ./EnumerationInputBinder */ "./lib/bindings/EnumerationInputBinder.ts"));
const ValueBinder_1 = __importDefault(__webpack_require__(/*! ./ValueBinder */ "./lib/bindings/ValueBinder.ts"));
const ScaleBinder_1 = __importDefault(__webpack_require__(/*! ./ScaleBinder */ "./lib/bindings/ScaleBinder.ts"));
const ButtonBinder_1 = __importDefault(__webpack_require__(/*! ./ButtonBinder */ "./lib/bindings/ButtonBinder.ts"));
const JumbotronBinder_1 = __importDefault(__webpack_require__(/*! ./JumbotronBinder */ "./lib/bindings/JumbotronBinder.ts"));
const CarouselBinder_1 = __importDefault(__webpack_require__(/*! ./CarouselBinder */ "./lib/bindings/CarouselBinder.ts"));
const CarouselPanelBinder_1 = __importDefault(__webpack_require__(/*! ./CarouselPanelBinder */ "./lib/bindings/CarouselPanelBinder.ts"));
const ProgressBarBinder_1 = __importDefault(__webpack_require__(/*! ./ProgressBarBinder */ "./lib/bindings/ProgressBarBinder.ts"));
const FormBinder_1 = __importDefault(__webpack_require__(/*! ./FormBinder */ "./lib/bindings/FormBinder.ts"));
const WizardTestResultsBinder_1 = __importDefault(__webpack_require__(/*! ./WizardTestResultsBinder */ "./lib/bindings/WizardTestResultsBinder.ts"));
const ConfirmWorkflowPanelBinder_1 = __importDefault(__webpack_require__(/*! ./ConfirmWorkflowPanelBinder */ "./lib/bindings/ConfirmWorkflowPanelBinder.ts"));
const CloseWorkflowExecutedPanelBinder_1 = __importDefault(__webpack_require__(/*! ./CloseWorkflowExecutedPanelBinder */ "./lib/bindings/CloseWorkflowExecutedPanelBinder.ts"));
const FakeUserBinder_1 = __importDefault(__webpack_require__(/*! ./FakeUserBinder */ "./lib/bindings/FakeUserBinder.ts"));
const FakeMessageBinder_1 = __importDefault(__webpack_require__(/*! ./FakeMessageBinder */ "./lib/bindings/FakeMessageBinder.ts"));
const FakeWizardBinder_1 = __importDefault(__webpack_require__(/*! ./FakeWizardBinder */ "./lib/bindings/FakeWizardBinder.ts"));
const FakeWorkflowBinder_1 = __importDefault(__webpack_require__(/*! ./FakeWorkflowBinder */ "./lib/bindings/FakeWorkflowBinder.ts"));
const MileStoneBinder_1 = __importDefault(__webpack_require__(/*! ./MileStoneBinder */ "./lib/bindings/MileStoneBinder.ts"));
const FakePageBinder_1 = __importDefault(__webpack_require__(/*! ./FakePageBinder */ "./lib/bindings/FakePageBinder.ts"));
const HorizontalRuleBinder_1 = __importDefault(__webpack_require__(/*! ./HorizontalRuleBinder */ "./lib/bindings/HorizontalRuleBinder.ts"));
const InitiateWorkflowButtonBinder_1 = __importDefault(__webpack_require__(/*! ./InitiateWorkflowButtonBinder */ "./lib/bindings/InitiateWorkflowButtonBinder.ts"));
const MenuBinder_1 = __importDefault(__webpack_require__(/*! ./MenuBinder */ "./lib/bindings/MenuBinder.ts"));
const MenuBrandBinder_1 = __importDefault(__webpack_require__(/*! ./MenuBrandBinder */ "./lib/bindings/MenuBrandBinder.ts"));
const MenuItemBinder_1 = __importDefault(__webpack_require__(/*! ./MenuItemBinder */ "./lib/bindings/MenuItemBinder.ts"));
const SubMenuBinder_1 = __importDefault(__webpack_require__(/*! ./SubMenuBinder */ "./lib/bindings/SubMenuBinder.ts"));
const SubMenuLabelBinder_1 = __importDefault(__webpack_require__(/*! ./SubMenuLabelBinder */ "./lib/bindings/SubMenuLabelBinder.ts"));
const TrayBinder_1 = __importDefault(__webpack_require__(/*! ./TrayBinder */ "./lib/bindings/TrayBinder.ts"));
const TrayHeaderBinder_1 = __importDefault(__webpack_require__(/*! ./TrayHeaderBinder */ "./lib/bindings/TrayHeaderBinder.ts"));
const FakeQueue_1 = __importDefault(__webpack_require__(/*! ./FakeQueue */ "./lib/bindings/FakeQueue.ts"));
const MessageExplorerBinder_1 = __importDefault(__webpack_require__(/*! ./MessageExplorerBinder */ "./lib/bindings/MessageExplorerBinder.ts"));
const NotificationBannerBinder_1 = __importDefault(__webpack_require__(/*! ./NotificationBannerBinder */ "./lib/bindings/NotificationBannerBinder.ts"));
const EmailBinder_1 = __importDefault(__webpack_require__(/*! ./EmailBinder */ "./lib/bindings/EmailBinder.ts"));
const EmailConfirmationLinkBinder_1 = __importDefault(__webpack_require__(/*! ./EmailConfirmationLinkBinder */ "./lib/bindings/EmailConfirmationLinkBinder.ts"));
const PasswordResetLinkBinder_1 = __importDefault(__webpack_require__(/*! ./PasswordResetLinkBinder */ "./lib/bindings/PasswordResetLinkBinder.ts"));
const ConfirmationPanelBinder_1 = __importDefault(__webpack_require__(/*! ./ConfirmationPanelBinder */ "./lib/bindings/ConfirmationPanelBinder.ts"));
const BrBinder_1 = __importDefault(__webpack_require__(/*! ./BrBinder */ "./lib/bindings/BrBinder.ts"));
const SpanBinder_1 = __importDefault(__webpack_require__(/*! ./SpanBinder */ "./lib/bindings/SpanBinder.ts"));
const UuidBinder_1 = __importDefault(__webpack_require__(/*! ./UuidBinder */ "./lib/bindings/UuidBinder.ts"));
const ScriptBinder_1 = __importDefault(__webpack_require__(/*! ./ScriptBinder */ "./lib/bindings/ScriptBinder.ts"));
const LoopBinder_1 = __importDefault(__webpack_require__(/*! ./LoopBinder */ "./lib/bindings/LoopBinder.ts"));
const SwitchBinder_1 = __importDefault(__webpack_require__(/*! ./SwitchBinder */ "./lib/bindings/SwitchBinder.ts"));
const registry = [
    new TitleBinder_1.default(),
    new ParagraphBinder_1.default(),
    new DivBinder_1.default(),
    new LoginPanelBinder_1.default(),
    new WellBinder_1.default(),
    new UserExplorerBinder_1.default(),
    new ImageBinder_1.default(),
    new LinkBinder_1.default(),
    new BackLinkBinder_1.default(),
    new RegisterPanelBinder_1.default(),
    new PageBinder_1.default(),
    new ResetPasswordRequestPanelBinder_1.default(),
    new ResetPasswordPanelBinder_1.default(),
    new AccordionItemHeaderBinder_1.default(),
    new InsetTextBinder_1.default(),
    new AccordionItemBinder_1.default(),
    new WarningBinder_1.default(),
    new ColumnBinder_1.default(),
    new RowBinder_1.default(),
    new CellBinder_1.default(),
    new TableBinder_1.default(),
    new BadgeBinder_1.default(),
    new AccordionBinder_1.default(),
    new CardHeaderBinder_1.default(),
    new CardBodyBinder_1.default(),
    new CardFooterBinder_1.default(),
    new CardBinder_1.default(),
    new IconBinder_1.default(),
    new ToolTipBinder_1.default(),
    new ListItemBinder_1.default(),
    new ListBinder_1.default(),
    new CookieConsentBinder_1.default(),
    new FakeStoreBinder_1.default(),
    new ErrorSummaryBinder_1.default(),
    new InputBinder_1.default(),
    new EnumerationInputBinder_1.default(),
    new ValueBinder_1.default(),
    new ScaleBinder_1.default(),
    new ButtonBinder_1.default(),
    new JumbotronBinder_1.default(),
    new CarouselBinder_1.default(),
    new CarouselPanelBinder_1.default(),
    new ProgressBarBinder_1.default(),
    new FormBinder_1.default(),
    new WizardTestResultsBinder_1.default(),
    new ConfirmWorkflowPanelBinder_1.default(),
    new CloseWorkflowExecutedPanelBinder_1.default(),
    new FakeUserBinder_1.default(),
    new FakeMessageBinder_1.default(),
    new FakeWizardBinder_1.default(),
    new FakeWorkflowBinder_1.default(),
    new FakePageBinder_1.default(),
    new FakeQueue_1.default(),
    new MileStoneBinder_1.default(),
    new HorizontalRuleBinder_1.default(),
    new InitiateWorkflowButtonBinder_1.default(),
    new MenuBinder_1.default(),
    new MenuBrandBinder_1.default(),
    new MenuItemBinder_1.default(),
    new SubMenuBinder_1.default(),
    new SubMenuLabelBinder_1.default(),
    new TrayBinder_1.default(),
    new TrayHeaderBinder_1.default(),
    new MessageExplorerBinder_1.default(),
    new NotificationBannerBinder_1.default(),
    new EmailBinder_1.default(),
    new EmailConfirmationLinkBinder_1.default(),
    new PasswordResetLinkBinder_1.default(),
    new ConfirmationPanelBinder_1.default(),
    new BrBinder_1.default(),
    new SpanBinder_1.default(),
    new UuidBinder_1.default(),
    new ScriptBinder_1.default(),
    new LoopBinder_1.default(),
    new SwitchBinder_1.default()
];
function findBinder(name) {
    return registry.find(builtin => builtin.accept(name));
}
exports.findBinder = findBinder;


/***/ }),

/***/ "./lib/flex-container-support.ts":
/*!***************************************!*\
  !*** ./lib/flex-container-support.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.flexContainerSupport = void 0;
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
function flexContainerSupport(data, classManager, attributes) {
    const styles = {
        display: 'flex'
    };
    if (attributes.padding) {
        styles['padding'] = attributes.padding;
    }
    if (attributes.orientation) {
        styles['flex-direction'] = attributes.orientation.toLowerCase().replaceAll("_", "-");
    }
    if (attributes.justifyContent) {
        if (attributes.justifyContent === 'START') {
            styles['justify-content'] = 'flex-start';
        }
        else if (attributes.justifyContent === 'END') {
            styles['justify-content'] = 'flex-end';
        }
        else if (attributes.justifyContent === 'CENTER') {
            styles['justify-content'] = 'center';
        }
        else if (attributes.justifyContent === 'SPACE_BETWEEN') {
            styles['justify-content'] = 'space-between';
        }
        else if (attributes.justifyContent === 'SPACE_AROUND') {
            styles['justify-content'] = 'space-around';
        }
    }
    if (attributes.alignItems) {
        if (attributes.alignItems === 'START') {
            styles['align-items'] = 'flex-start';
        }
        else if (attributes.alignItems === 'END') {
            styles['align-items'] = 'flex-end';
        }
        else if (attributes.alignItems === 'CENTER') {
            styles['align-items'] = 'center';
        }
        else if (attributes.alignItems === 'BASELINE') {
            styles['align-items'] = 'baseline';
        }
        else if (attributes.alignItems === 'STRETCH') {
            styles['align-items'] = 'stretch';
        }
    }
    if (attributes.alignContent) {
        if (attributes.alignContent === 'START') {
            styles['align-content'] = 'flex-start';
        }
        else if (attributes.alignContent === 'END') {
            styles['align-content'] = 'flex-end';
        }
        else if (attributes.alignContent === 'CENTER') {
            styles['align-content'] = 'center';
        }
        else if (attributes.alignContent === 'BASELINE') {
            styles['align-content'] = 'baseline';
        }
        else if (attributes.alignContent === 'STRETCH') {
            styles['align-content'] = 'stretch';
        }
    }
    if (attributes.wrap) {
        styles['flex-wrap'] = attributes.wrap.toLowerCase().replaceAll("_", "-");
    }
    const buffer = new StringBuffer_1.StringBuffer();
    for (const [key, value] of Object.entries(styles)) {
        buffer.append(`${key}: ${value};`);
    }
    data.containerStyles = buffer.toString();
}
exports.flexContainerSupport = flexContainerSupport;


/***/ }),

/***/ "./lib/flex-item-support.ts":
/*!**********************************!*\
  !*** ./lib/flex-item-support.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
function flexItemSupport(data, classManager, attributes) {
    const styles = {};
    if (attributes.padding) {
        styles['padding'] = attributes.padding;
    }
    if (attributes.margin) {
        styles['margin'] = attributes.margin;
    }
    if (attributes.flexBasis) {
        styles['flex-basis'] = attributes.flexBasis;
    }
    if (attributes.flexGrow) {
        styles['flex-grow'] = attributes.flexGrow;
    }
    if (attributes.flexShrink) {
        styles['flex-shrink'] = attributes.flexShrink;
    }
    if (attributes.alignSelf) {
        if (attributes.alignSelf === 'START') {
            styles['align-self'] = 'flex-start';
        }
        else if (attributes.alignSelf === 'END') {
            styles['align-self'] = 'flex-end';
        }
        else if (attributes.alignSelf === 'CENTER') {
            styles['align-self'] = 'center';
        }
        else if (attributes.alignSelf === 'BASELINE') {
            styles['align-self'] = 'baseline';
        }
        else if (attributes.alignSelf === 'STRETCH') {
            styles['align-self'] = 'stretch';
        }
    }
    if (attributes.height) {
        styles['height'] = attributes.height;
    }
    if (attributes.width) {
        styles['width'] = attributes.width;
    }
    if (attributes.borderRadius) {
        styles['border-radius'] = attributes.borderRadius;
    }
    if (attributes.backgroundFlavour) {
        classManager.append(attributes.backgroundFlavour, 'bg-', '');
    }
    const buffer = new StringBuffer_1.StringBuffer();
    for (const [key, value] of Object.entries(styles)) {
        buffer.append(`${key}: ${value};`);
    }
    data.itemStyles = buffer.toString();
}
exports["default"] = flexItemSupport;


/***/ }),

/***/ "./lib/freemarker.ts":
/*!***************************!*\
  !*** ./lib/freemarker.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TemplateEngine = void 0;
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const lexer_1 = __webpack_require__(/*! ./freemarker/template/lexer */ "./lib/freemarker/template/lexer.ts");
const LexicalTokenType_1 = __webpack_require__(/*! ./freemarker/template/LexicalTokenType */ "./lib/freemarker/template/LexicalTokenType.ts");
const Value_1 = __webpack_require__(/*! ./freemarker/expression/Value */ "./lib/freemarker/expression/Value.ts");
const expression_engine_1 = __webpack_require__(/*! ./freemarker/expression-engine */ "./lib/freemarker/expression-engine.ts");
const TemplateError_1 = __webpack_require__(/*! ./freemarker/TemplateError */ "./lib/freemarker/TemplateError.ts");
const ProhibitedError_1 = __webpack_require__(/*! ./freemarker/ProhibitedError */ "./lib/freemarker/ProhibitedError.ts");
const isHash_1 = __webpack_require__(/*! ./utilities/isHash */ "./lib/utilities/isHash.ts");
const PROHIBITED = [
    "attempt", "recover", "autoesc", "compress", "escape", "noescape", "flush", "ftl", "function", "return", "global",
    "import", "include", "continue", "local", "macro", "nested", "return", "nooautoesc", "noparse", "nt",
    "outputformat", "settings", "stop", "t", "lt", "rt", "visit", "recurse", "fallback"
];
class TemplateEngine {
    constructor() {
        this.expressionEngine = new expression_engine_1.ExpressionEngine();
    }
    render(template, data) {
        const tokens = (0, lexer_1.parse)(template);
        return this.consume(tokens, data)[0];
    }
    discard(tokens) {
        var _a;
        let level = 0;
        while (tokens.length) {
            const token = tokens.shift();
            if (token.getType() === LexicalTokenType_1.LexicalTokenType.CLOSE_DIRECTIVE) {
                if (token.getText() === 'if' || token.getText() === 'list' || token.getText() === 'assign' || token.getText() === 'items' || token.getText() === 'switch') {
                    if (level) {
                        level--;
                    }
                    else {
                        return token;
                    }
                }
            }
            else if (token.getType() === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE) {
                if (token.getText() === 'if' || token.getText() === 'list' || token.getText() === 'items' || token.getText() === 'switch') {
                    level++;
                }
                else if (token.getText() === 'assign') {
                    if (!((_a = token.getParams()) === null || _a === void 0 ? void 0 : _a.includes("="))) {
                        level++;
                    }
                }
                else if (level === 0 && (token.getText() === 'else' || token.getText() === 'elseif' || token.getText() === 'case' || token.getText() === 'default')) {
                    return token;
                }
            }
        }
    }
    consume(tokens, data) {
        const buffer = new StringBuffer_1.StringBuffer();
        while (tokens.length) {
            const token = tokens.shift();
            if (token.getType() === LexicalTokenType_1.LexicalTokenType.TEXT) {
                buffer.append(token.getText());
            }
            else if (token.getType() === LexicalTokenType_1.LexicalTokenType.INTERPOLATION) {
                buffer.append(this.expressionEngine.build(token.getParams(), token.getParamsRow(), token.getParamsColumn()).evaluate(data).retrieve());
            }
            else if (token.getType() === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE) {
                if (token.getText() === 'assign') {
                    const [result, close] = this.handleAssign(token.getParams(), token.getParamsRow(), token.getParamsColumn(), tokens, data);
                }
                else if (token.getText() === 'if') {
                    const [result, close] = this.handleIf(token.getParams(), token.getParamsRow(), token.getParamsColumn(), tokens, data);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) !== 'if') {
                        throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), "Invalid closing tag for if");
                    }
                    buffer.append(result);
                }
                else if (token.getText() === 'list') {
                    const [result, close] = this.handleList(token.getParams(), token.getParamsRow(), token.getParamsColumn(), tokens, data);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) !== 'list') {
                        throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), "Invalid closing tag for list");
                    }
                    buffer.append(result);
                }
                else if (token.getText() === 'switch') {
                    const [result, close] = this.handleSwitch(token.getParams(), token.getParamsRow(), token.getParamsColumn(), tokens, data);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) !== 'switch') {
                        throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), "Invalid closing tag for switch");
                    }
                    buffer.append(result);
                }
                else if (token.getText() === 'else') {
                    return [buffer.toString(), token];
                }
                else if (token.getText() === 'elseif') {
                    return [buffer.toString(), token];
                }
                else if (token.getText() === 'items') {
                    return [buffer.toString(), token];
                }
                else if (token.getText() === 'sep') {
                    return [buffer.toString(), token];
                }
                else if (token.getText() === 'break') {
                    return [buffer.toString(), token];
                }
                else if (token.getText() === 'case') {
                    //ignore case directive as we stop on 'break'
                }
                else if (PROHIBITED.includes(token.getText())) {
                    throw new ProhibitedError_1.ProhibitedError(token.getRow(), token.getColumn(), `Directive is prohibited '${token.getText()}'`);
                }
                else {
                    throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Unsupported directive '${token.getText()}'`);
                }
            }
            else if (token.getType() === LexicalTokenType_1.LexicalTokenType.CLOSE_DIRECTIVE) {
                return [buffer.toString(), token];
            }
        }
        return [buffer.toString(), undefined];
    }
    processList(tokens, data, sequence, argName) {
        const copy = [...tokens];
        let block = undefined;
        let result = "";
        let separator = undefined;
        let close = undefined;
        const buffer = new StringBuffer_1.StringBuffer();
        for (let i = 0; i < sequence.length; i++) {
            const scope = Object.assign({}, data);
            scope[argName] = sequence[i];
            scope[`$${argName}$`] = true;
            scope[`$${argName}_index$`] = i;
            scope[`$${argName}_length$`] = sequence.length;
            if (separator) {
                buffer.append(separator);
            }
            if (block) {
                const local = [...block];
                let [result, close] = this.consume(local, scope);
                buffer.append(result);
                if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                    [separator, close] = this.consume(local, scope);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                        [result, close] = this.consume(local, scope);
                        buffer.append(result);
                    }
                }
            }
            else {
                [result, close] = this.consume(tokens, scope);
                buffer.append(result);
                if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                    [separator, close] = this.consume(tokens, scope);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                        [result, close] = this.consume(tokens, scope);
                        buffer.append(result);
                    }
                }
                block = copy.slice(0, copy.length - tokens.length - 1);
            }
        }
        if (sequence.length === 0) {
            const scope = Object.assign({}, data);
            scope[argName] = undefined;
            close = this.discard(tokens);
        }
        return [buffer.toString(), close];
    }
    processHash(tokens, data, hash, keyName, argName) {
        const copy = [...tokens];
        let block = undefined;
        let result = "";
        let separator = undefined;
        let close = undefined;
        const buffer = new StringBuffer_1.StringBuffer();
        for (const key in hash) {
            const value = hash[key];
            const scope = Object.assign({}, data);
            scope[keyName] = key;
            scope[argName] = value;
            if (separator) {
                buffer.append(separator);
            }
            if (block) {
                const local = [...block];
                let [result, close] = this.consume(local, scope);
                buffer.append(result);
                if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                    [separator, close] = this.consume(local, scope);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                        [result, close] = this.consume(local, scope);
                        buffer.append(result);
                    }
                }
            }
            else {
                [result, close] = this.consume(tokens, scope);
                buffer.append(result);
                if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                    [separator, close] = this.consume(tokens, scope);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) === 'sep') {
                        [result, close] = this.consume(tokens, scope);
                        buffer.append(result);
                    }
                }
                block = copy.slice(0, copy.length - tokens.length - 1);
            }
        }
        if (Object.keys(hash).length === 0) {
            const scope = Object.assign({}, data);
            scope[argName] = undefined;
            close = this.discard(tokens);
        }
        return [buffer.toString(), close];
    }
    handleList(expression, row, column, tokens, data) {
        const buffer = new StringBuffer_1.StringBuffer();
        let result = undefined, close = undefined;
        if (expression.includes(" as ")) {
            const [refName, argName] = expression.split(" as ").map(x => x.trim());
            const subject = this.expressionEngine.build(refName, row, column).evaluate(data).retrieve();
            if (Array.isArray(subject)) {
                [result, close] = this.processList(tokens, data, subject, argName);
                buffer.append(result);
            }
            else if ((0, isHash_1.isHash)(subject)) {
                const [key, value] = argName.split(",").map(s => s.trim());
                [result, close] = this.processHash(tokens, data, subject, key, value);
                buffer.append(result);
            }
            else {
                throw new TemplateError_1.TemplateError(row, column, "'as' operator requires an iterable subject (hash or sequence).");
            }
            let text = undefined;
            if ((close === null || close === void 0 ? void 0 : close.getText()) === 'else') {
                if (subject.length === 0) {
                    [text, close] = this.consume(tokens, data);
                    buffer.append(text);
                }
                else {
                    close = this.discard(tokens);
                }
            }
        }
        else {
            const ref = this.expressionEngine.build(expression, row, column).evaluate(data);
            const subject = ref.retrieve();
            if (Array.isArray(subject) || (0, isHash_1.isHash)(subject)) {
                if ((Array.isArray(subject) && subject.length) || ((0, isHash_1.isHash)(subject) && Object.keys(subject).length)) {
                    [result, close] = this.consume(tokens, data);
                    buffer.append(result);
                    if ((close === null || close === void 0 ? void 0 : close.getType()) === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE && (close === null || close === void 0 ? void 0 : close.getText()) === 'items') {
                        if (Array.isArray(subject)) {
                            const [blank, argName] = close.getParams().split("as").map(x => x.trim());
                            [result, close] = this.processList(tokens, data, subject, argName);
                            buffer.append(result);
                        }
                        else if ((0, isHash_1.isHash)(subject)) {
                            const [blank, argName] = close === null || close === void 0 ? void 0 : close.getParams().split("as").map(x => x.trim());
                            const [key, value] = argName.split(",").map(s => s.trim());
                            [result, close] = this.processHash(tokens, data, subject, key, value);
                            buffer.append(result);
                        }
                    }
                    if ((close === null || close === void 0 ? void 0 : close.getType()) === LexicalTokenType_1.LexicalTokenType.CLOSE_DIRECTIVE && (close === null || close === void 0 ? void 0 : close.getText()) === 'items') {
                        [result, close] = this.consume(tokens, data);
                        buffer.append(result);
                    }
                    if ((close === null || close === void 0 ? void 0 : close.getText()) === 'else') {
                        close = this.discard(tokens);
                    }
                }
                else {
                    close = this.discard(tokens);
                    if ((close === null || close === void 0 ? void 0 : close.getText()) === 'else') {
                        [result, close] = this.consume(tokens, data);
                        buffer.append(result);
                    }
                }
                if (close && close.getText() !== 'list') {
                    throw new TemplateError_1.TemplateError(close.getColumn(), close.getRow(), "List improperly terminated");
                }
            }
            else {
                throw new TemplateError_1.TemplateError(row, column, "list directive requires an iterable subject (sequence or hash).");
            }
        }
        return [buffer.toString(), close];
    }
    handleAssign(expression, row, column, tokens, data) {
        const value = this.expressionEngine.build(expression, row, column).evaluate(data);
        if (value instanceof Value_1.Reference) {
            const [result, close] = this.consume(tokens, data);
            value.assign(result);
            return ["", close];
        }
        return ["", undefined];
    }
    handleIf(expression, row, column, tokens, data) {
        let result = undefined, text = undefined, close = undefined;
        const bool = this.expressionEngine.build(expression, row, column).evaluate(data).retrieve();
        if (bool) {
            [text, close] = this.consume(tokens, data);
            result = text;
        }
        else {
            close = this.discard(tokens);
        }
        while (close && close.getType() === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE && close.getText() === 'elseif') {
            const bool = this.expressionEngine.build(close.getParams(), close.getRow(), close.getColumn()).evaluate(data).retrieve();
            if (bool && result === undefined) {
                [text, close] = this.consume(tokens, data);
                result = text;
            }
            else {
                close = this.discard(tokens);
            }
        }
        if ((close === null || close === void 0 ? void 0 : close.getText()) === 'else') {
            if (result === undefined) {
                [text, close] = this.consume(tokens, data);
                result = text;
            }
            else {
                close = this.discard(tokens);
            }
        }
        return [result || "", close];
    }
    handleSwitch(expression, row, column, tokens, data) {
        let text = undefined, close = undefined;
        const result = new StringBuffer_1.StringBuffer();
        const reference = this.expressionEngine.build(expression, row, column).evaluate(data).retrieve();
        let current = tokens.shift();
        while (current && current.getType() !== LexicalTokenType_1.LexicalTokenType.CLOSE_DIRECTIVE) {
            if (current.getType() === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE && current.getText() === 'case') {
                const value = this.expressionEngine.build(current.getParams(), current.getRow(), current.getColumn()).evaluate(data).retrieve();
                if (reference === value) {
                    while (current && current.getType() === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE && current.getText() === "case") {
                        [text, current] = this.consume(tokens, data);
                        result.append(text);
                    }
                    while (current && current.getType() !== LexicalTokenType_1.LexicalTokenType.CLOSE_DIRECTIVE) {
                        current = this.discard(tokens);
                    }
                }
                else {
                    current = this.discard(tokens);
                }
            }
            else if (current.getType() === LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE && current.getText() === 'default') {
                if (text) {
                    current = this.discard(tokens);
                }
                else {
                    [text, current] = this.consume(tokens, data);
                    result.append(text);
                }
            }
            else {
                current = tokens.shift();
            }
        }
        return [result.toString(), current];
    }
}
exports.TemplateEngine = TemplateEngine;


/***/ }),

/***/ "./lib/freemarker/FreemarkerError.ts":
/*!*******************************************!*\
  !*** ./lib/freemarker/FreemarkerError.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FreemarkerError = void 0;
class FreemarkerError extends Error {
    constructor(message, cause = undefined) {
        super(message);
        this.cause = cause;
    }
}
exports.FreemarkerError = FreemarkerError;


/***/ }),

/***/ "./lib/freemarker/ProhibitedError.ts":
/*!*******************************************!*\
  !*** ./lib/freemarker/ProhibitedError.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ProhibitedError = void 0;
const TemplateError_1 = __webpack_require__(/*! ./TemplateError */ "./lib/freemarker/TemplateError.ts");
class ProhibitedError extends TemplateError_1.TemplateError {
}
exports.ProhibitedError = ProhibitedError;


/***/ }),

/***/ "./lib/freemarker/ReferenceNotFoundError.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/ReferenceNotFoundError.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReferenceNotFoundError = void 0;
const TemplateError_1 = __webpack_require__(/*! ./TemplateError */ "./lib/freemarker/TemplateError.ts");
class ReferenceNotFoundError extends TemplateError_1.TemplateError {
}
exports.ReferenceNotFoundError = ReferenceNotFoundError;


/***/ }),

/***/ "./lib/freemarker/TemplateError.ts":
/*!*****************************************!*\
  !*** ./lib/freemarker/TemplateError.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TemplateError = void 0;
class TemplateError extends Error {
    constructor(row, column, message, cause = undefined) {
        super(`(${row + 1}:${column + 1}) ${message}`);
        this.cause = cause;
    }
}
exports.TemplateError = TemplateError;


/***/ }),

/***/ "./lib/freemarker/builtin/BooleanBuiltin.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/builtin/BooleanBuiltin.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BooleanBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class BooleanBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "boolean";
    }
    evaluate(subject, data, row, column) {
        if (subject === "true") {
            return Value_1.Literal.of(true);
        }
        if (subject === "false") {
            return Value_1.Literal.of(false);
        }
        throw new TemplateError_1.TemplateError(row, column, `Cannot convert string to boolean`);
    }
}
exports.BooleanBuiltin = BooleanBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/CapFirstBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/CapFirstBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CapFirstBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isWhitespace_1 = __webpack_require__(/*! ../../utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
class CapFirstBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "cap_first";
    }
    evaluate(subject, data) {
        let index = 0;
        while (index < subject.length) {
            if (!(0, isWhitespace_1.isWhitespace)(subject.charAt(index))) {
                break;
            }
            index++;
        }
        return Value_1.Literal.of(subject.slice(0, index) + subject.charAt(index).toUpperCase() + subject.slice(index + 1));
    }
}
exports.CapFirstBuiltin = CapFirstBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/CapitalizeBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/CapitalizeBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CapitalizeBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isWhitespace_1 = __webpack_require__(/*! ../../utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
class CapitalizeBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "capitalize";
    }
    evaluate(subject, data) {
        const output = [];
        let latch = true;
        for (let i = 0; i < subject.length; i++) {
            const c = subject.charAt(i);
            if (latch) {
                output.push(c.toUpperCase());
                latch = false;
            }
            else {
                if ((0, isWhitespace_1.isWhitespace)(c)) {
                    latch = true;
                }
                output.push(c.toLowerCase());
            }
        }
        return Value_1.Literal.of(output.join(""));
    }
}
exports.CapitalizeBuiltin = CapitalizeBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/CeilBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/CeilBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CeilBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class CeilBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "ceil";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(Math.ceil(subject));
    }
}
exports.CeilBuiltin = CeilBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/ChopLinebreakBuiltin.ts":
/*!********************************************************!*\
  !*** ./lib/freemarker/builtin/ChopLinebreakBuiltin.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChopLinebreakBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class ChopLinebreakBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "chop_linebreak";
    }
    evaluate(subject, data) {
        const length = subject.length;
        if (subject.length && subject.charAt(length - 1) === '\n') {
            if (subject.length > 2 && subject.charAt(length - 2) === '\r') {
                return Value_1.Literal.of(subject.slice(0, length - 2));
            }
            return Value_1.Literal.of(subject.slice(0, length - 1));
        }
        else if (subject.length && subject.charAt(length - 1) === '\r') {
            return Value_1.Literal.of(subject.slice(0, length - 1));
        }
        return Value_1.Literal.of(subject);
    }
}
exports.ChopLinebreakBuiltin = ChopLinebreakBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/ChunkBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/ChunkBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ChunkBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class ChunkBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "chunk";
    }
    evaluate(subject, arg1, data) {
        const length = arg1.evaluate(data).retrieve();
        const results = [];
        let group = undefined;
        for (let i = 0; i < subject.length; i++) {
            if (i % length === 0) {
                if (group) {
                    results.push(group);
                }
                group = [];
            }
            group.push(subject[i]);
        }
        results.push(group);
        return Value_1.Literal.of(results);
    }
}
exports.ChunkBuiltin = ChunkBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/ContainsBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/ContainsBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ContainsBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class ContainsBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "contains";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.includes(arg.evaluate(data).retrieve()));
    }
}
exports.ContainsBuiltin = ContainsBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/DateBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/DateBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DateBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isDate_1 = __webpack_require__(/*! ../../utilities/isDate */ "./lib/utilities/isDate.ts");
class DateBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return (typeof subject === "string" || (0, isDate_1.isDate)(subject)) && name === "date";
    }
    evaluate(subject, data) {
        const dte = (0, isDate_1.isDate)(subject) ? subject : new Date(subject);
        dte.setHours(0);
        return Value_1.Literal.of(dte);
    }
}
exports.DateBuiltin = DateBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/DatetimeBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/DatetimeBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DatetimeBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isDate_1 = __webpack_require__(/*! ../../utilities/isDate */ "./lib/utilities/isDate.ts");
class DatetimeBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return (typeof subject === "string" || (0, isDate_1.isDate)(subject)) && name === "datetime";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of((0, isDate_1.isDate)(subject) ? subject : new Date(subject));
    }
}
exports.DatetimeBuiltin = DatetimeBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/DropWhileBuiltin.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/builtin/DropWhileBuiltin.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DropWhileBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const LambdaExpression_1 = __webpack_require__(/*! ../expression/LambdaExpression */ "./lib/freemarker/expression/LambdaExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class DropWhileBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "drop_while";
    }
    evaluate(subject, arg1, data, row, column) {
        const result = [];
        const lambda = arg1;
        if (!(lambda instanceof LambdaExpression_1.LambdaExpression)) {
            throw new TemplateError_1.TemplateError(row, column, `Invalid argument, only lambda is current supported`);
        }
        let i = 0;
        let bool = true;
        while (i < subject.length) {
            if (bool) {
                bool = lambda.evaluate(Object.assign({ '$$': subject[i] }, data)).retrieve();
            }
            if (!bool) {
                result.push(subject[i]);
            }
            i++;
        }
        return Value_1.Literal.of(result);
    }
}
exports.DropWhileBuiltin = DropWhileBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/EndsWithBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/EndsWithBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EndsWithBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class EndsWithBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "ends_with";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.endsWith(arg.evaluate(data).retrieve()));
    }
}
exports.EndsWithBuiltin = EndsWithBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/EnsureEndsWithBuiltin.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/builtin/EnsureEndsWithBuiltin.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EnsureEndsWithBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class EnsureEndsWithBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "ensure_ends_with";
    }
    evaluate(subject, arg1, data) {
        const arg = arg1.evaluate(data).retrieve();
        for (let i = 0; i < arg.length; i++) {
            if (subject.endsWith(arg.slice(0, arg.length - i))) {
                return Value_1.Literal.of(subject + arg.slice(arg.length - i));
            }
        }
        return Value_1.Literal.of(subject + arg);
    }
}
exports.EnsureEndsWithBuiltin = EnsureEndsWithBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/EnsureStartsWithBuiltin.ts":
/*!***********************************************************!*\
  !*** ./lib/freemarker/builtin/EnsureStartsWithBuiltin.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EnsureStartsWithBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class EnsureStartsWithBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "ensure_starts_with";
    }
    calculate(subject, args, data, row, column) {
        if (args.length === 1) {
            const arg = args[0].evaluate(data).retrieve();
            for (let i = 0; i < arg.length; i++) {
                if (subject.startsWith(arg.slice(i))) {
                    return Value_1.Literal.of(arg.slice(0, i) + subject);
                }
            }
            return Value_1.Literal.of(arg + subject);
        }
        else if (args.length === 2) {
            const regex = args[0].evaluate(data).retrieve();
            const replace = args[1].evaluate(data).retrieve();
            return Value_1.Literal.of(subject.replace(new RegExp(regex), replace));
        }
        else {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments`);
        }
    }
}
exports.EnsureStartsWithBuiltin = EnsureStartsWithBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/FilterBuiltin.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/builtin/FilterBuiltin.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FilterBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const LambdaExpression_1 = __webpack_require__(/*! ../expression/LambdaExpression */ "./lib/freemarker/expression/LambdaExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class FilterBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "filter";
    }
    evaluate(subject, arg1, data, row, column) {
        const result = [];
        const lambda = arg1;
        if (!(lambda instanceof LambdaExpression_1.LambdaExpression)) {
            throw new TemplateError_1.TemplateError(row, column, `Invalid argument, only lambda is current supported`);
        }
        let i = 0;
        while (i < subject.length) {
            const bool = lambda.evaluate(Object.assign({ '$$': subject[i] }, data)).retrieve();
            if (bool) {
                result.push(subject[i]);
            }
            i++;
        }
        return Value_1.Literal.of(result);
    }
}
exports.FilterBuiltin = FilterBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/FirstBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/FirstBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FirstBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class FirstBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "first";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject[0]);
    }
}
exports.FirstBuiltin = FirstBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/FloorBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/FloorBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FloorBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class FloorBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "floor";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(Math.floor(subject));
    }
}
exports.FloorBuiltin = FloorBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/HasContentBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/HasContentBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HasContentBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isHash_1 = __webpack_require__(/*! ../../utilities/isHash */ "./lib/utilities/isHash.ts");
class HasContentBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return name === "has_content";
    }
    evaluate(subject, data, row, column) {
        if (subject === undefined) {
            return Value_1.Literal.of(false);
        }
        if (subject === null) {
            return Value_1.Literal.of(false);
        }
        if (Array.isArray(subject)) {
            return Value_1.Literal.of(subject.length > 0);
        }
        if ((0, isHash_1.isHash)(subject)) {
            return Value_1.Literal.of(Object.keys(subject).length > 0);
        }
        if (typeof subject === "string") {
            return Value_1.Literal.of(subject.length > 0);
        }
        return Value_1.Literal.of(true);
    }
}
exports.HasContentBuiltin = HasContentBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/IndexOfBuiltin.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/builtin/IndexOfBuiltin.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IndexOfWithBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class IndexOfWithBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "index_of";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.indexOf(arg.evaluate(data).retrieve()));
    }
}
exports.IndexOfWithBuiltin = IndexOfWithBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/IsInfiniteBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/IsInfiniteBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IsInfiniteBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class IsInfiniteBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "is_infinite";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(!isFinite(subject));
    }
}
exports.IsInfiniteBuiltin = IsInfiniteBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/IsNanBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/IsNanBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IsNanBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class IsNanBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "is_nan";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(isNaN(subject));
    }
}
exports.IsNanBuiltin = IsNanBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/JoinBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/JoinBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.JoinBuiltin = void 0;
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
class JoinBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "join";
    }
    evaluate(subject, arg, data) {
        const separator = arg.evaluate(data).retrieve();
        return Value_1.Literal.of(subject.join(separator));
    }
}
exports.JoinBuiltin = JoinBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/KeepAfterBuiltin.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/builtin/KeepAfterBuiltin.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KeepAfterBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class KeepAfterBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "keep_after";
    }
    evaluate(subject, arg, data) {
        const index = subject.indexOf(arg.evaluate(data).retrieve());
        if (index >= 0) {
            return Value_1.Literal.of(subject.substring(index + arg.evaluate(data).retrieve().length));
        }
        else {
            return Value_1.Literal.of("");
        }
    }
}
exports.KeepAfterBuiltin = KeepAfterBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/KeepAfterLastBuiltin.ts":
/*!********************************************************!*\
  !*** ./lib/freemarker/builtin/KeepAfterLastBuiltin.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KeepAfterLastBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class KeepAfterLastBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "keep_after_last";
    }
    evaluate(subject, arg, data) {
        const index = subject.lastIndexOf(arg.evaluate(data).retrieve());
        if (index >= 0) {
            return Value_1.Literal.of(subject.substring(index + arg.evaluate(data).retrieve().length));
        }
        else {
            return Value_1.Literal.of("");
        }
    }
}
exports.KeepAfterLastBuiltin = KeepAfterLastBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/KeepBeforeBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/KeepBeforeBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KeepBeforeBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class KeepBeforeBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "keep_before";
    }
    evaluate(subject, arg, data) {
        const index = subject.indexOf(arg.evaluate(data).retrieve());
        if (index >= 0) {
            return Value_1.Literal.of(subject.substring(0, index));
        }
        else {
            return Value_1.Literal.of("");
        }
    }
}
exports.KeepBeforeBuiltin = KeepBeforeBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/KeepBeforeLastBuiltin.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/builtin/KeepBeforeLastBuiltin.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.KeepBeforeLastBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class KeepBeforeLastBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "keep_before_last";
    }
    evaluate(subject, arg, data) {
        const index = subject.lastIndexOf(arg.evaluate(data).retrieve());
        if (index >= 0) {
            return Value_1.Literal.of(subject.substring(0, index));
        }
        else {
            return Value_1.Literal.of("");
        }
    }
}
exports.KeepBeforeLastBuiltin = KeepBeforeLastBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/LastBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/LastBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LastBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class LastBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "last";
    }
    evaluate(subject, data, row, column) {
        if (subject.length) {
            return Value_1.Literal.of(subject[subject.length - 1]);
        }
        else {
            throw new TemplateError_1.TemplateError(row, column, `Sequence is empty, 'last' builtin error`);
        }
    }
}
exports.LastBuiltin = LastBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/LastIndexOfBuiltin.ts":
/*!******************************************************!*\
  !*** ./lib/freemarker/builtin/LastIndexOfBuiltin.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LastIndexOfWithBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class LastIndexOfWithBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "last_index_of";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.lastIndexOf(arg.evaluate(data).retrieve()));
    }
}
exports.LastIndexOfWithBuiltin = LastIndexOfWithBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/LeftPadBuiltin.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/builtin/LeftPadBuiltin.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LeftPadBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class LeftPadBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "left_pad";
    }
    calculate(subject, args, data, row, column) {
        if (args.length === 0 || args.length > 2) {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments`);
        }
        const length = args[0].evaluate(data).retrieve();
        let filler = ' ';
        if (args.length === 2) {
            filler = args[1].evaluate(data).retrieve();
        }
        const padding = filler.repeat(length);
        const missing = length - subject.length;
        if (missing > 0) {
            return Value_1.Literal.of(padding.substring(0, missing) + subject);
        }
        return Value_1.Literal.of(subject);
    }
}
exports.LeftPadBuiltin = LeftPadBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/LengthBuiltin.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/builtin/LengthBuiltin.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LengthBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class LengthBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "length";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.length);
    }
}
exports.LengthBuiltin = LengthBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/LowerAbcBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/LowerAbcBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LowerAbcBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class LowerAbcBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "lower_abc";
    }
    evaluate(subject, data) {
        const result = [];
        let val = subject;
        while (val > 0) {
            let units = (val - 1) % 26;
            result.unshift(String.fromCharCode(units + 97));
            val = (val - (units + 1)) / 26;
        }
        return Value_1.Literal.of(result.join(""));
    }
}
exports.LowerAbcBuiltin = LowerAbcBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/LowerCaseBuiltin.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/builtin/LowerCaseBuiltin.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LowerCaseBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class LowerCaseBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "lower_case";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.toLowerCase());
    }
}
exports.LowerCaseBuiltin = LowerCaseBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/MapBuiltin.ts":
/*!**********************************************!*\
  !*** ./lib/freemarker/builtin/MapBuiltin.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MapBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const LambdaExpression_1 = __webpack_require__(/*! ../expression/LambdaExpression */ "./lib/freemarker/expression/LambdaExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class MapBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "map";
    }
    evaluate(subject, arg1, data, row, column) {
        const result = [];
        const lambda = arg1;
        if (!(lambda instanceof LambdaExpression_1.LambdaExpression)) {
            throw new TemplateError_1.TemplateError(row, column, `Invalid argument, only lambda is current supported`);
        }
        let i = 0;
        while (i < subject.length) {
            result.push(lambda.evaluate(Object.assign({ '$$': subject[i] }, data)).retrieve());
            i++;
        }
        return Value_1.Literal.of(result);
    }
}
exports.MapBuiltin = MapBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/MatchesBuiltin.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/builtin/MatchesBuiltin.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MatchesBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class MatchesBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "matches";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.match("^" + arg.evaluate(data).retrieve() + "$") !== null);
    }
}
exports.MatchesBuiltin = MatchesBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/MaxBuiltin.ts":
/*!**********************************************!*\
  !*** ./lib/freemarker/builtin/MaxBuiltin.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MaxBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class MaxBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "max";
    }
    evaluate(subject, data) {
        if (subject.length === 0) {
            return Value_1.Literal.of(undefined);
        }
        let result = Number.MIN_VALUE;
        for (let i = 0; i < subject.length; i++) {
            if (subject[i] > result) {
                result = subject[i];
            }
        }
        return Value_1.Literal.of(result);
    }
}
exports.MaxBuiltin = MaxBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/MinBuiltin.ts":
/*!**********************************************!*\
  !*** ./lib/freemarker/builtin/MinBuiltin.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MinBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class MinBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "min";
    }
    evaluate(subject, data) {
        if (subject.length === 0) {
            return Value_1.Literal.of(undefined);
        }
        let result = Number.MAX_VALUE;
        for (let i = 0; i < subject.length; i++) {
            if (subject[i] < result) {
                result = subject[i];
            }
        }
        return Value_1.Literal.of(result);
    }
}
exports.MinBuiltin = MinBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/NoArgBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/NoArgBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NoArgBuiltin = void 0;
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class NoArgBuiltin {
    calculate(subject, args, data, row, column) {
        if (args.length === 0) {
            return this.evaluate(subject, data, row, column);
        }
        else {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments`);
        }
    }
}
exports.NoArgBuiltin = NoArgBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/NumberExpression.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/builtin/NumberExpression.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NumberBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class NumberBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "number";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(Number(subject));
    }
}
exports.NumberBuiltin = NumberBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/OneArgBuiltin.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/builtin/OneArgBuiltin.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OneArgBuiltin = void 0;
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class OneArgBuiltin {
    calculate(subject, args, data, row, column) {
        if (args.length === 1) {
            return this.evaluate(subject, args[0], data, row, column);
        }
        else {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments`);
        }
    }
}
exports.OneArgBuiltin = OneArgBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/RemoveBeginningBuiltin.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/builtin/RemoveBeginningBuiltin.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RemoveBeginningBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class RemoveBeginningBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "remove_beginning";
    }
    evaluate(subject, arg1, data) {
        const arg = arg1.evaluate(data).retrieve();
        if (subject.startsWith(arg)) {
            return Value_1.Literal.of(subject.slice(arg.length));
        }
        return Value_1.Literal.of(subject);
    }
}
exports.RemoveBeginningBuiltin = RemoveBeginningBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/RemoveEndingBuiltin.ts":
/*!*******************************************************!*\
  !*** ./lib/freemarker/builtin/RemoveEndingBuiltin.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RemoveEndingBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class RemoveEndingBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "remove_ending";
    }
    evaluate(subject, arg1, data) {
        const arg = arg1.evaluate(data).retrieve();
        if (subject.endsWith(arg)) {
            return Value_1.Literal.of(subject.slice(0, subject.length - arg.length));
        }
        return Value_1.Literal.of(subject);
    }
}
exports.RemoveEndingBuiltin = RemoveEndingBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/ReplaceBuiltin.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/builtin/ReplaceBuiltin.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReplaceBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const TwoArgBuiltin_1 = __webpack_require__(/*! ./TwoArgBuiltin */ "./lib/freemarker/builtin/TwoArgBuiltin.ts");
class ReplaceBuiltin extends TwoArgBuiltin_1.TwoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "replace";
    }
    evaluate(subject, arg1, arg2, data) {
        return Value_1.Literal.of(subject.replaceAll(arg1.evaluate(data).retrieve(), arg2.evaluate(data).retrieve()));
    }
}
exports.ReplaceBuiltin = ReplaceBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/ReverseBuiltin.ts":
/*!**************************************************!*\
  !*** ./lib/freemarker/builtin/ReverseBuiltin.ts ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReverseBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class ReverseBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "reverse";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.reverse());
    }
}
exports.ReverseBuiltin = ReverseBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/RightPadBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/RightPadBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RightPadBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class RightPadBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "right_pad";
    }
    calculate(subject, args, data, row, column) {
        if (args.length === 0 || args.length > 2) {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments`);
        }
        const length = args[0].evaluate(data).retrieve();
        let filler = ' ';
        if (args.length === 2) {
            filler = args[1].evaluate(data).retrieve();
        }
        const padding = filler.repeat(length);
        const missing = length - subject.length;
        if (missing > 0) {
            return Value_1.Literal.of(subject + padding.substring(0, missing));
        }
        return Value_1.Literal.of(subject);
    }
}
exports.RightPadBuiltin = RightPadBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/RoundBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/RoundBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RoundBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class RoundBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "round";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(Math.round(subject));
    }
}
exports.RoundBuiltin = RoundBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SeqContainsBuiltin.ts":
/*!******************************************************!*\
  !*** ./lib/freemarker/builtin/SeqContainsBuiltin.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SeqContainsBuiltin = void 0;
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
class SeqContainsBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "seq_contains";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.includes(arg.evaluate(data).retrieve()));
    }
}
exports.SeqContainsBuiltin = SeqContainsBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SeqIndexOfBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/SeqIndexOfBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SeqIndexOfBuiltin = void 0;
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
class SeqIndexOfBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "seq_index_of";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.indexOf(arg.evaluate(data).retrieve()));
    }
}
exports.SeqIndexOfBuiltin = SeqIndexOfBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SeqLastIndexOfBuiltin.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/builtin/SeqLastIndexOfBuiltin.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SeqLastIndexOfBuiltin = void 0;
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
class SeqLastIndexOfBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "seq_last_index_of";
    }
    evaluate(subject, arg, data) {
        return Value_1.Literal.of(subject.lastIndexOf(arg.evaluate(data).retrieve()));
    }
}
exports.SeqLastIndexOfBuiltin = SeqLastIndexOfBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SizeBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/SizeBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SizeBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class SizeBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "size";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.length);
    }
}
exports.SizeBuiltin = SizeBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SortBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/SortBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SortBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class SortBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "sort";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.sort());
    }
}
exports.SortBuiltin = SortBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SortByBuiltin.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/builtin/SortByBuiltin.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SortByBuiltin = void 0;
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const isHash_1 = __webpack_require__(/*! ../../utilities/isHash */ "./lib/utilities/isHash.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class SortByBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "sort_by";
    }
    evaluate(subject, arg, data, row, column) {
        const name = arg.evaluate(data).retrieve();
        if (subject.find(x => !(0, isHash_1.isHash)(x))) {
            throw new TemplateError_1.TemplateError(row, column, `Attempt to use sort_by on array element that is not a hash`);
        }
        return Value_1.Literal.of(subject.sort((x, y) => x[name] < y[name] ? -1 : 0));
    }
}
exports.SortByBuiltin = SortByBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/SplitBuiltin.ts":
/*!************************************************!*\
  !*** ./lib/freemarker/builtin/SplitBuiltin.ts ***!
  \************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SplitBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class SplitBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "split";
    }
    evaluate(subject, arg1, data) {
        const arg = arg1.evaluate(data).retrieve();
        return Value_1.Literal.of(subject.split(arg));
    }
}
exports.SplitBuiltin = SplitBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/StartsWithBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/StartsWithBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StartsWithBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
class StartsWithBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "starts_with";
    }
    evaluate(subject, arg1, data) {
        const arg = arg1.evaluate(data).retrieve();
        return Value_1.Literal.of(subject.startsWith(arg));
    }
}
exports.StartsWithBuiltin = StartsWithBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/StringBuiltin.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/builtin/StringBuiltin.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StringBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const isDate_1 = __webpack_require__(/*! ../../utilities/isDate */ "./lib/utilities/isDate.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class StringBuiltin {
    accept(subject, name) {
        return (typeof subject === "number" || typeof subject === "string" || (0, isDate_1.isDate)(subject) || typeof subject === "boolean") && name === "string";
    }
    calculate(subject, args, data, row, column) {
        if (typeof subject === "boolean") {
            if (args.length === 2) {
                const arg1 = args[0].evaluate(data).retrieve();
                if (typeof arg1 !== "string") {
                    throw new TemplateError_1.TemplateError(row, column, `Invalid argument, string takes string arguments`);
                }
                const arg2 = args[1].evaluate(data).retrieve();
                if (typeof arg2 !== "string") {
                    throw new TemplateError_1.TemplateError(row, column, `Invalid argument, string takes string arguments`);
                }
                return Value_1.Literal.of(subject ? arg1 : arg2);
            }
            else {
                throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments supplied`);
            }
        }
        else if (args.length === 0) {
            if ((0, isDate_1.isDate)(subject)) {
                return Value_1.Literal.of(subject.toISOString());
            }
            return Value_1.Literal.of(String(subject));
        }
        else {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments supplied`);
        }
    }
}
exports.StringBuiltin = StringBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/TakeWhileBuiltin.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/builtin/TakeWhileBuiltin.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TakeWhileBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const LambdaExpression_1 = __webpack_require__(/*! ../expression/LambdaExpression */ "./lib/freemarker/expression/LambdaExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class TakeWhileBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return Array.isArray(subject) && name === "take_while";
    }
    evaluate(subject, arg1, data, row, column) {
        const result = [];
        const lambda = arg1;
        if (!(lambda instanceof LambdaExpression_1.LambdaExpression)) {
            throw new TemplateError_1.TemplateError(row, column, `Invalid argument, only lambda is current supported`);
        }
        let i = 0;
        let bool = true;
        while (i < subject.length) {
            if (bool) {
                bool = lambda.evaluate(Object.assign({ '$$': subject[i] }, data)).retrieve();
            }
            if (bool) {
                result.push(subject[i]);
            }
            i++;
        }
        return Value_1.Literal.of(result);
    }
}
exports.TakeWhileBuiltin = TakeWhileBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/ThenBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/ThenBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ThenBuiltin = void 0;
const TwoArgBuiltin_1 = __webpack_require__(/*! ./TwoArgBuiltin */ "./lib/freemarker/builtin/TwoArgBuiltin.ts");
class ThenBuiltin extends TwoArgBuiltin_1.TwoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "boolean" && name === "then";
    }
    evaluate(subject, arg1, arg2, data) {
        return subject ? arg1.evaluate(data) : arg2.evaluate(data);
    }
}
exports.ThenBuiltin = ThenBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/TimeBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/TimeBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TimeBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isDate_1 = __webpack_require__(/*! ../../utilities/isDate */ "./lib/utilities/isDate.ts");
class TimeBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return (typeof subject === "string" || (0, isDate_1.isDate)(subject)) && name === "time";
    }
    evaluate(subject, data) {
        const dte = (0, isDate_1.isDate)(subject) ? subject : new Date(subject);
        const millis = dte.getTime();
        return Value_1.Literal.of(new Date(millis % 86400000));
    }
}
exports.TimeBuiltin = TimeBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/TrimBuiltin.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/builtin/TrimBuiltin.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrimBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class TrimBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "trim";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.trim());
    }
}
exports.TrimBuiltin = TrimBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/TruncateBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/TruncateBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TruncateBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const OneArgBuiltin_1 = __webpack_require__(/*! ./OneArgBuiltin */ "./lib/freemarker/builtin/OneArgBuiltin.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class TruncateBuiltin extends OneArgBuiltin_1.OneArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "truncate";
    }
    evaluate(subject, arg1, data, row, column) {
        const arg = arg1.evaluate(data).retrieve();
        if (typeof arg !== "number") {
            throw new TemplateError_1.TemplateError(row, column, `Argument to truncate is not a number`);
        }
        if (subject.length > arg - 5) {
            return Value_1.Literal.of(subject.substring(0, arg - 5) + "[...]");
        }
        else {
            return Value_1.Literal.of(subject);
        }
    }
}
exports.TruncateBuiltin = TruncateBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/TwoArgBuiltin.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/builtin/TwoArgBuiltin.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TwoArgBuiltin = void 0;
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
class TwoArgBuiltin {
    calculate(subject, args, data, row, column) {
        if (args.length === 2) {
            return this.evaluate(subject, args[0], args[1], data);
        }
        else {
            throw new TemplateError_1.TemplateError(row, column, `Invalid number of arguments`);
        }
    }
}
exports.TwoArgBuiltin = TwoArgBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/UncapFirstBuiltin.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/builtin/UncapFirstBuiltin.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UncapFirstBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isWhitespace_1 = __webpack_require__(/*! ../../utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
class UncapFirstBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "uncap_first";
    }
    evaluate(subject, data) {
        let index = 0;
        while (index < subject.length) {
            if (!(0, isWhitespace_1.isWhitespace)(subject.charAt(index))) {
                break;
            }
            index++;
        }
        return Value_1.Literal.of(subject.slice(0, index) + subject.charAt(index).toLowerCase() + subject.slice(index + 1));
    }
}
exports.UncapFirstBuiltin = UncapFirstBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/UpperAbcBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/UpperAbcBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpperAbcBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class UpperAbcBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "number" && name === "upper_abc";
    }
    evaluate(subject, data) {
        const result = [];
        let val = subject;
        while (val > 0) {
            let units = (val - 1) % 26;
            result.unshift(String.fromCharCode(units + 65));
            val = (val - (units + 1)) / 26;
        }
        return Value_1.Literal.of(result.join(""));
    }
}
exports.UpperAbcBuiltin = UpperAbcBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/UpperCaseBuiltin.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/builtin/UpperCaseBuiltin.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UpperCaseBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class UpperCaseBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "upper_case";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.toUpperCase());
    }
}
exports.UpperCaseBuiltin = UpperCaseBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/UrlBuiltin.ts":
/*!**********************************************!*\
  !*** ./lib/freemarker/builtin/UrlBuiltin.ts ***!
  \**********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.UrlBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
class UrlBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "url";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(encodeURI(subject));
    }
}
exports.UrlBuiltin = UrlBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/WordListBuiltin.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/builtin/WordListBuiltin.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.WordListBuiltin = void 0;
const Value_1 = __webpack_require__(/*! ../expression/Value */ "./lib/freemarker/expression/Value.ts");
const NoArgBuiltin_1 = __webpack_require__(/*! ./NoArgBuiltin */ "./lib/freemarker/builtin/NoArgBuiltin.ts");
const isWhitespace_1 = __webpack_require__(/*! ../../utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
class WordListBuiltin extends NoArgBuiltin_1.NoArgBuiltin {
    accept(subject, name) {
        return typeof subject === "string" && name === "word_list";
    }
    evaluate(subject, data) {
        return Value_1.Literal.of(subject.split(" ").filter(arg => arg.length).filter(arg => !(0, isWhitespace_1.isWhitespace)(arg)));
    }
}
exports.WordListBuiltin = WordListBuiltin;


/***/ }),

/***/ "./lib/freemarker/builtin/index.ts":
/*!*****************************************!*\
  !*** ./lib/freemarker/builtin/index.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.find = void 0;
const ThenBuiltin_1 = __webpack_require__(/*! ./ThenBuiltin */ "./lib/freemarker/builtin/ThenBuiltin.ts");
const UpperCaseBuiltin_1 = __webpack_require__(/*! ./UpperCaseBuiltin */ "./lib/freemarker/builtin/UpperCaseBuiltin.ts");
const LowerCaseBuiltin_1 = __webpack_require__(/*! ./LowerCaseBuiltin */ "./lib/freemarker/builtin/LowerCaseBuiltin.ts");
const CapFirstBuiltin_1 = __webpack_require__(/*! ./CapFirstBuiltin */ "./lib/freemarker/builtin/CapFirstBuiltin.ts");
const CapitalizeBuiltin_1 = __webpack_require__(/*! ./CapitalizeBuiltin */ "./lib/freemarker/builtin/CapitalizeBuiltin.ts");
const UncapFirstBuiltin_1 = __webpack_require__(/*! ./UncapFirstBuiltin */ "./lib/freemarker/builtin/UncapFirstBuiltin.ts");
const TrimBuiltin_1 = __webpack_require__(/*! ./TrimBuiltin */ "./lib/freemarker/builtin/TrimBuiltin.ts");
const ChopLinebreakBuiltin_1 = __webpack_require__(/*! ./ChopLinebreakBuiltin */ "./lib/freemarker/builtin/ChopLinebreakBuiltin.ts");
const BooleanBuiltin_1 = __webpack_require__(/*! ./BooleanBuiltin */ "./lib/freemarker/builtin/BooleanBuiltin.ts");
const DateBuiltin_1 = __webpack_require__(/*! ./DateBuiltin */ "./lib/freemarker/builtin/DateBuiltin.ts");
const DatetimeBuiltin_1 = __webpack_require__(/*! ./DatetimeBuiltin */ "./lib/freemarker/builtin/DatetimeBuiltin.ts");
const TimeBuiltin_1 = __webpack_require__(/*! ./TimeBuiltin */ "./lib/freemarker/builtin/TimeBuiltin.ts");
const LengthBuiltin_1 = __webpack_require__(/*! ./LengthBuiltin */ "./lib/freemarker/builtin/LengthBuiltin.ts");
const SizeBuiltin_1 = __webpack_require__(/*! ./SizeBuiltin */ "./lib/freemarker/builtin/SizeBuiltin.ts");
const StringBuiltin_1 = __webpack_require__(/*! ./StringBuiltin */ "./lib/freemarker/builtin/StringBuiltin.ts");
const ContainsBuiltin_1 = __webpack_require__(/*! ./ContainsBuiltin */ "./lib/freemarker/builtin/ContainsBuiltin.ts");
const EndsWithBuiltin_1 = __webpack_require__(/*! ./EndsWithBuiltin */ "./lib/freemarker/builtin/EndsWithBuiltin.ts");
const EnsureEndsWithBuiltin_1 = __webpack_require__(/*! ./EnsureEndsWithBuiltin */ "./lib/freemarker/builtin/EnsureEndsWithBuiltin.ts");
const EnsureStartsWithBuiltin_1 = __webpack_require__(/*! ./EnsureStartsWithBuiltin */ "./lib/freemarker/builtin/EnsureStartsWithBuiltin.ts");
const IndexOfBuiltin_1 = __webpack_require__(/*! ./IndexOfBuiltin */ "./lib/freemarker/builtin/IndexOfBuiltin.ts");
const LastIndexOfBuiltin_1 = __webpack_require__(/*! ./LastIndexOfBuiltin */ "./lib/freemarker/builtin/LastIndexOfBuiltin.ts");
const KeepAfterBuiltin_1 = __webpack_require__(/*! ./KeepAfterBuiltin */ "./lib/freemarker/builtin/KeepAfterBuiltin.ts");
const KeepAfterLastBuiltin_1 = __webpack_require__(/*! ./KeepAfterLastBuiltin */ "./lib/freemarker/builtin/KeepAfterLastBuiltin.ts");
const KeepBeforeBuiltin_1 = __webpack_require__(/*! ./KeepBeforeBuiltin */ "./lib/freemarker/builtin/KeepBeforeBuiltin.ts");
const KeepBeforeLastBuiltin_1 = __webpack_require__(/*! ./KeepBeforeLastBuiltin */ "./lib/freemarker/builtin/KeepBeforeLastBuiltin.ts");
const LeftPadBuiltin_1 = __webpack_require__(/*! ./LeftPadBuiltin */ "./lib/freemarker/builtin/LeftPadBuiltin.ts");
const RightPadBuiltin_1 = __webpack_require__(/*! ./RightPadBuiltin */ "./lib/freemarker/builtin/RightPadBuiltin.ts");
const MatchesBuiltin_1 = __webpack_require__(/*! ./MatchesBuiltin */ "./lib/freemarker/builtin/MatchesBuiltin.ts");
const NumberExpression_1 = __webpack_require__(/*! ./NumberExpression */ "./lib/freemarker/builtin/NumberExpression.ts");
const ReplaceBuiltin_1 = __webpack_require__(/*! ./ReplaceBuiltin */ "./lib/freemarker/builtin/ReplaceBuiltin.ts");
const RemoveBeginningBuiltin_1 = __webpack_require__(/*! ./RemoveBeginningBuiltin */ "./lib/freemarker/builtin/RemoveBeginningBuiltin.ts");
const RemoveEndingBuiltin_1 = __webpack_require__(/*! ./RemoveEndingBuiltin */ "./lib/freemarker/builtin/RemoveEndingBuiltin.ts");
const SplitBuiltin_1 = __webpack_require__(/*! ./SplitBuiltin */ "./lib/freemarker/builtin/SplitBuiltin.ts");
const StartsWithBuiltin_1 = __webpack_require__(/*! ./StartsWithBuiltin */ "./lib/freemarker/builtin/StartsWithBuiltin.ts");
const TruncateBuiltin_1 = __webpack_require__(/*! ./TruncateBuiltin */ "./lib/freemarker/builtin/TruncateBuiltin.ts");
const UrlBuiltin_1 = __webpack_require__(/*! ./UrlBuiltin */ "./lib/freemarker/builtin/UrlBuiltin.ts");
const WordListBuiltin_1 = __webpack_require__(/*! ./WordListBuiltin */ "./lib/freemarker/builtin/WordListBuiltin.ts");
const IsInfiniteBuiltin_1 = __webpack_require__(/*! ./IsInfiniteBuiltin */ "./lib/freemarker/builtin/IsInfiniteBuiltin.ts");
const IsNanBuiltin_1 = __webpack_require__(/*! ./IsNanBuiltin */ "./lib/freemarker/builtin/IsNanBuiltin.ts");
const LowerAbcBuiltin_1 = __webpack_require__(/*! ./LowerAbcBuiltin */ "./lib/freemarker/builtin/LowerAbcBuiltin.ts");
const UpperAbcBuiltin_1 = __webpack_require__(/*! ./UpperAbcBuiltin */ "./lib/freemarker/builtin/UpperAbcBuiltin.ts");
const RoundBuiltin_1 = __webpack_require__(/*! ./RoundBuiltin */ "./lib/freemarker/builtin/RoundBuiltin.ts");
const CeilBuiltin_1 = __webpack_require__(/*! ./CeilBuiltin */ "./lib/freemarker/builtin/CeilBuiltin.ts");
const FloorBuiltin_1 = __webpack_require__(/*! ./FloorBuiltin */ "./lib/freemarker/builtin/FloorBuiltin.ts");
const ChunkBuiltin_1 = __webpack_require__(/*! ./ChunkBuiltin */ "./lib/freemarker/builtin/ChunkBuiltin.ts");
const DropWhileBuiltin_1 = __webpack_require__(/*! ./DropWhileBuiltin */ "./lib/freemarker/builtin/DropWhileBuiltin.ts");
const FilterBuiltin_1 = __webpack_require__(/*! ./FilterBuiltin */ "./lib/freemarker/builtin/FilterBuiltin.ts");
const FirstBuiltin_1 = __webpack_require__(/*! ./FirstBuiltin */ "./lib/freemarker/builtin/FirstBuiltin.ts");
const JoinBuiltin_1 = __webpack_require__(/*! ./JoinBuiltin */ "./lib/freemarker/builtin/JoinBuiltin.ts");
const LastBuiltin_1 = __webpack_require__(/*! ./LastBuiltin */ "./lib/freemarker/builtin/LastBuiltin.ts");
const MapBuiltin_1 = __webpack_require__(/*! ./MapBuiltin */ "./lib/freemarker/builtin/MapBuiltin.ts");
const MinBuiltin_1 = __webpack_require__(/*! ./MinBuiltin */ "./lib/freemarker/builtin/MinBuiltin.ts");
const MaxBuiltin_1 = __webpack_require__(/*! ./MaxBuiltin */ "./lib/freemarker/builtin/MaxBuiltin.ts");
const ReverseBuiltin_1 = __webpack_require__(/*! ./ReverseBuiltin */ "./lib/freemarker/builtin/ReverseBuiltin.ts");
const SeqContainsBuiltin_1 = __webpack_require__(/*! ./SeqContainsBuiltin */ "./lib/freemarker/builtin/SeqContainsBuiltin.ts");
const SeqIndexOfBuiltin_1 = __webpack_require__(/*! ./SeqIndexOfBuiltin */ "./lib/freemarker/builtin/SeqIndexOfBuiltin.ts");
const SeqLastIndexOfBuiltin_1 = __webpack_require__(/*! ./SeqLastIndexOfBuiltin */ "./lib/freemarker/builtin/SeqLastIndexOfBuiltin.ts");
const SortBuiltin_1 = __webpack_require__(/*! ./SortBuiltin */ "./lib/freemarker/builtin/SortBuiltin.ts");
const SortByBuiltin_1 = __webpack_require__(/*! ./SortByBuiltin */ "./lib/freemarker/builtin/SortByBuiltin.ts");
const TakeWhileBuiltin_1 = __webpack_require__(/*! ./TakeWhileBuiltin */ "./lib/freemarker/builtin/TakeWhileBuiltin.ts");
const HasContentBuiltin_1 = __webpack_require__(/*! ./HasContentBuiltin */ "./lib/freemarker/builtin/HasContentBuiltin.ts");
const registry = [
    new ThenBuiltin_1.ThenBuiltin(),
    new UpperCaseBuiltin_1.UpperCaseBuiltin(),
    new LowerCaseBuiltin_1.LowerCaseBuiltin(),
    new CapFirstBuiltin_1.CapFirstBuiltin(),
    new CapitalizeBuiltin_1.CapitalizeBuiltin(),
    new UncapFirstBuiltin_1.UncapFirstBuiltin(),
    new TrimBuiltin_1.TrimBuiltin(),
    new ChopLinebreakBuiltin_1.ChopLinebreakBuiltin(),
    new BooleanBuiltin_1.BooleanBuiltin(),
    new DateBuiltin_1.DateBuiltin(),
    new DatetimeBuiltin_1.DatetimeBuiltin(),
    new TimeBuiltin_1.TimeBuiltin(),
    new LengthBuiltin_1.LengthBuiltin(),
    new SizeBuiltin_1.SizeBuiltin(),
    new StringBuiltin_1.StringBuiltin(),
    new ContainsBuiltin_1.ContainsBuiltin(),
    new EndsWithBuiltin_1.EndsWithBuiltin(),
    new EnsureEndsWithBuiltin_1.EnsureEndsWithBuiltin(),
    new EnsureStartsWithBuiltin_1.EnsureStartsWithBuiltin(),
    new IndexOfBuiltin_1.IndexOfWithBuiltin(),
    new LastIndexOfBuiltin_1.LastIndexOfWithBuiltin(),
    new KeepAfterBuiltin_1.KeepAfterBuiltin(),
    new KeepAfterLastBuiltin_1.KeepAfterLastBuiltin(),
    new KeepBeforeBuiltin_1.KeepBeforeBuiltin(),
    new KeepBeforeLastBuiltin_1.KeepBeforeLastBuiltin(),
    new LeftPadBuiltin_1.LeftPadBuiltin(),
    new RightPadBuiltin_1.RightPadBuiltin(),
    new MatchesBuiltin_1.MatchesBuiltin(),
    new NumberExpression_1.NumberBuiltin(),
    new ReplaceBuiltin_1.ReplaceBuiltin(),
    new RemoveBeginningBuiltin_1.RemoveBeginningBuiltin(),
    new RemoveEndingBuiltin_1.RemoveEndingBuiltin(),
    new SplitBuiltin_1.SplitBuiltin(),
    new StartsWithBuiltin_1.StartsWithBuiltin(),
    new TruncateBuiltin_1.TruncateBuiltin(),
    new UrlBuiltin_1.UrlBuiltin(),
    new WordListBuiltin_1.WordListBuiltin(),
    new IsInfiniteBuiltin_1.IsInfiniteBuiltin(),
    new IsNanBuiltin_1.IsNanBuiltin(),
    new LowerAbcBuiltin_1.LowerAbcBuiltin(),
    new UpperAbcBuiltin_1.UpperAbcBuiltin(),
    new RoundBuiltin_1.RoundBuiltin(),
    new CeilBuiltin_1.CeilBuiltin(),
    new FloorBuiltin_1.FloorBuiltin(),
    new ChunkBuiltin_1.ChunkBuiltin(),
    new DropWhileBuiltin_1.DropWhileBuiltin(),
    new FilterBuiltin_1.FilterBuiltin(),
    new FirstBuiltin_1.FirstBuiltin(),
    new JoinBuiltin_1.JoinBuiltin(),
    new LastBuiltin_1.LastBuiltin(),
    new MapBuiltin_1.MapBuiltin(),
    new MinBuiltin_1.MinBuiltin(),
    new MaxBuiltin_1.MaxBuiltin(),
    new ReverseBuiltin_1.ReverseBuiltin(),
    new SeqContainsBuiltin_1.SeqContainsBuiltin(),
    new SeqIndexOfBuiltin_1.SeqIndexOfBuiltin(),
    new SeqLastIndexOfBuiltin_1.SeqLastIndexOfBuiltin(),
    new SortBuiltin_1.SortBuiltin(),
    new SortByBuiltin_1.SortByBuiltin(),
    new TakeWhileBuiltin_1.TakeWhileBuiltin(),
    new HasContentBuiltin_1.HasContentBuiltin()
];
function find(subject, name) {
    return registry.find(builtin => builtin.accept(subject, name));
}
exports.find = find;


/***/ }),

/***/ "./lib/freemarker/expression-engine.ts":
/*!*********************************************!*\
  !*** ./lib/freemarker/expression-engine.ts ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ExpressionEngine = void 0;
const tokenize_1 = __webpack_require__(/*! ./expression/tokenize */ "./lib/freemarker/expression/tokenize.ts");
const TemplateError_1 = __webpack_require__(/*! ./TemplateError */ "./lib/freemarker/TemplateError.ts");
const EqualExpression_1 = __webpack_require__(/*! ./expression/EqualExpression */ "./lib/freemarker/expression/EqualExpression.ts");
const AdditionExpression_1 = __webpack_require__(/*! ./expression/AdditionExpression */ "./lib/freemarker/expression/AdditionExpression.ts");
const DivisionExpression_1 = __webpack_require__(/*! ./expression/DivisionExpression */ "./lib/freemarker/expression/DivisionExpression.ts");
const AndExpression_1 = __webpack_require__(/*! ./expression/AndExpression */ "./lib/freemarker/expression/AndExpression.ts");
const DecrementExpression_1 = __webpack_require__(/*! ./expression/DecrementExpression */ "./lib/freemarker/expression/DecrementExpression.ts");
const AssignExpression_1 = __webpack_require__(/*! ./expression/AssignExpression */ "./lib/freemarker/expression/AssignExpression.ts");
const DereferenceExpression_1 = __webpack_require__(/*! ./expression/DereferenceExpression */ "./lib/freemarker/expression/DereferenceExpression.ts");
const CallMethodExpression_1 = __webpack_require__(/*! ./expression/CallMethodExpression */ "./lib/freemarker/expression/CallMethodExpression.ts");
const CallBuiltinExpression_1 = __webpack_require__(/*! ./expression/CallBuiltinExpression */ "./lib/freemarker/expression/CallBuiltinExpression.ts");
const NegativeExpression_1 = __webpack_require__(/*! ./expression/NegativeExpression */ "./lib/freemarker/expression/NegativeExpression.ts");
const PositiveExpression_1 = __webpack_require__(/*! ./expression/PositiveExpression */ "./lib/freemarker/expression/PositiveExpression.ts");
const NotExpression_1 = __webpack_require__(/*! ./expression/NotExpression */ "./lib/freemarker/expression/NotExpression.ts");
const ReferenceExpression_1 = __webpack_require__(/*! ./expression/ReferenceExpression */ "./lib/freemarker/expression/ReferenceExpression.ts");
const StringExpression_1 = __webpack_require__(/*! ./expression/StringExpression */ "./lib/freemarker/expression/StringExpression.ts");
const TrueExpression_1 = __webpack_require__(/*! ./expression/TrueExpression */ "./lib/freemarker/expression/TrueExpression.ts");
const FalseExpression_1 = __webpack_require__(/*! ./expression/FalseExpression */ "./lib/freemarker/expression/FalseExpression.ts");
const NumberExpression_1 = __webpack_require__(/*! ./expression/NumberExpression */ "./lib/freemarker/expression/NumberExpression.ts");
const SequenceExpression_1 = __webpack_require__(/*! ./expression/SequenceExpression */ "./lib/freemarker/expression/SequenceExpression.ts");
const HashExpression_1 = __webpack_require__(/*! ./expression/HashExpression */ "./lib/freemarker/expression/HashExpression.ts");
const DefaultExpression_1 = __webpack_require__(/*! ./expression/DefaultExpression */ "./lib/freemarker/expression/DefaultExpression.ts");
const SubstractionExpression_1 = __webpack_require__(/*! ./expression/SubstractionExpression */ "./lib/freemarker/expression/SubstractionExpression.ts");
const MultiplicationExpression_1 = __webpack_require__(/*! ./expression/MultiplicationExpression */ "./lib/freemarker/expression/MultiplicationExpression.ts");
const ModulusExpression_1 = __webpack_require__(/*! ./expression/ModulusExpression */ "./lib/freemarker/expression/ModulusExpression.ts");
const NotEqualExpression_1 = __webpack_require__(/*! ./expression/NotEqualExpression */ "./lib/freemarker/expression/NotEqualExpression.ts");
const OrExpression_1 = __webpack_require__(/*! ./expression/OrExpression */ "./lib/freemarker/expression/OrExpression.ts");
const LessThanExpression_1 = __webpack_require__(/*! ./expression/LessThanExpression */ "./lib/freemarker/expression/LessThanExpression.ts");
const GreaterThanExpression_1 = __webpack_require__(/*! ./expression/GreaterThanExpression */ "./lib/freemarker/expression/GreaterThanExpression.ts");
const LessThanOrEqualExpression_1 = __webpack_require__(/*! ./expression/LessThanOrEqualExpression */ "./lib/freemarker/expression/LessThanOrEqualExpression.ts");
const GreaterThanOrEqualExpression_1 = __webpack_require__(/*! ./expression/GreaterThanOrEqualExpression */ "./lib/freemarker/expression/GreaterThanOrEqualExpression.ts");
const AddAndAssignExpression_1 = __webpack_require__(/*! ./expression/AddAndAssignExpression */ "./lib/freemarker/expression/AddAndAssignExpression.ts");
const SubstractAndAssignExpression_1 = __webpack_require__(/*! ./expression/SubstractAndAssignExpression */ "./lib/freemarker/expression/SubstractAndAssignExpression.ts");
const MultiplyAndAssignExpression_1 = __webpack_require__(/*! ./expression/MultiplyAndAssignExpression */ "./lib/freemarker/expression/MultiplyAndAssignExpression.ts");
const DivideAndAssignExpression_1 = __webpack_require__(/*! ./expression/DivideAndAssignExpression */ "./lib/freemarker/expression/DivideAndAssignExpression.ts");
const ModulusAndAssignExpression_1 = __webpack_require__(/*! ./expression/ModulusAndAssignExpression */ "./lib/freemarker/expression/ModulusAndAssignExpression.ts");
const RangeStartingExpression_1 = __webpack_require__(/*! ./expression/RangeStartingExpression */ "./lib/freemarker/expression/RangeStartingExpression.ts");
const RangeInclusiveExpression_1 = __webpack_require__(/*! ./expression/RangeInclusiveExpression */ "./lib/freemarker/expression/RangeInclusiveExpression.ts");
const RangeExclusiveExpression_1 = __webpack_require__(/*! ./expression/RangeExclusiveExpression */ "./lib/freemarker/expression/RangeExclusiveExpression.ts");
const RangeLengthIncrementExpression_1 = __webpack_require__(/*! ./expression/RangeLengthIncrementExpression */ "./lib/freemarker/expression/RangeLengthIncrementExpression.ts");
const RangeLengthDecrementExpression_1 = __webpack_require__(/*! ./expression/RangeLengthDecrementExpression */ "./lib/freemarker/expression/RangeLengthDecrementExpression.ts");
const SliceExpression_1 = __webpack_require__(/*! ./expression/SliceExpression */ "./lib/freemarker/expression/SliceExpression.ts");
const IsDefinedExpression_1 = __webpack_require__(/*! ./expression/IsDefinedExpression */ "./lib/freemarker/expression/IsDefinedExpression.ts");
const IncrementExpression_1 = __webpack_require__(/*! ./expression/IncrementExpression */ "./lib/freemarker/expression/IncrementExpression.ts");
const ParenthesisExpression_1 = __webpack_require__(/*! ./expression/ParenthesisExpression */ "./lib/freemarker/expression/ParenthesisExpression.ts");
const AncillaryExpression_1 = __webpack_require__(/*! ./expression/AncillaryExpression */ "./lib/freemarker/expression/AncillaryExpression.ts");
const LambdaExpression_1 = __webpack_require__(/*! ./expression/LambdaExpression */ "./lib/freemarker/expression/LambdaExpression.ts");
const ComposingExpression_1 = __webpack_require__(/*! ./expression/ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
const PRECEDENCE = {
    '?': 2,
    '.': 2,
    '??': 2,
    'default': 2,
    '(': 2,
    '[': 2,
    '/': 3,
    '*': 3,
    '%': 3,
    '+': 4,
    '-': 4,
    '..<': 5,
    '..!': 5,
    '..*': 5,
    '..': 5,
    '..*-': 5,
    '..*+': 5,
    'not': 5,
    '<': 6,
    '>': 6,
    '>=': 6,
    '<=': 6,
    '==': 7,
    '!=': 7,
    '&&': 8,
    '||': 9,
    '->': 10,
    '+=': 11,
    '-=': 11,
    '/=': 11,
    '%=': 11,
    '*=': 11,
    '=': 11,
};
function interpretOperand(tokens) {
    let token = tokens.shift(), expression = undefined;
    if (token === undefined) {
        throw new Error("Should never happen");
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.CLOSE_HASH) {
        return [undefined, token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.CLOSE_SEQUENCE) {
        return [undefined, token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.CLOSE_PARENTHESIS) {
        return [undefined, token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.OPEN_PARENTHESIS) {
        const row = token.getRow();
        const column = token.getColumn();
        [expression, token] = interpretExpression(tokens);
        if ((token === null || token === void 0 ? void 0 : token.getType()) != tokenize_1.TokenType.CLOSE_PARENTHESIS) {
            throw new TemplateError_1.TemplateError(row, column, `Open parenthesis not closed with a close parenthesis`);
        }
        if (expression === undefined) {
            throw new TemplateError_1.TemplateError(row, column, `Parenthesis is empty`);
        }
        return [new ParenthesisExpression_1.ParenthesisExpression(expression, token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.PLUS) {
        //we have encountered a + symbol where we expect an expression, so it is the sign for a number that follows.
        const [arg, token] = interpretOperand(tokens);
        if (arg === undefined) {
            throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Unary operator '${token.getToken()}' expects an expression`);
        }
        return [new PositiveExpression_1.PositiveExpression(arg, token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.MINUS) {
        //we have encountered a - symbol where we expect an expression, so it is the sign for a number that follows.
        const [arg, token] = interpretOperand(tokens);
        if (arg === undefined) {
            throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Unary operator '${token.getToken()}' expects an expression`);
        }
        return [new NegativeExpression_1.NegativeExpression(arg, token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.BANG) {
        const [arg, token] = interpretOperand(tokens);
        if (arg === undefined) {
            throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Unary operator '${token.getToken()}' expects an expression`);
        }
        return [new NotExpression_1.NotExpression(arg, token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.REFERENCE) {
        return [new ReferenceExpression_1.ReferenceExpression(token.getToken(), token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.STRING) {
        return [new StringExpression_1.StringExpression(token.getToken(), token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.TRUE) {
        return [new TrueExpression_1.TrueExpression(token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.FALSE) {
        return [new FalseExpression_1.FalseExpression(token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.NUMBER) {
        return [new NumberExpression_1.NumberExpression(token.getToken(), token.getRow(), token.getColumn()), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.OPEN_SEQUENCE) {
        const elements = [];
        let row = token.getRow(), column = token.getColumn();
        [expression, token] = interpretExpression(tokens);
        if (token === undefined) {
            throw new TemplateError_1.TemplateError(row, column, `sequence incorrectly terminated`);
        }
        while ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.COMMA) {
            if (expression === undefined) {
                throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Expression preceding comma in sequence is empty`);
            }
            elements.push(expression);
            row = token.getRow();
            column = token.getColumn();
            [expression, token] = interpretExpression(tokens);
            if (token === undefined) {
                throw new TemplateError_1.TemplateError(row, column, `sequence incorrectly terminated`);
            }
        }
        if (expression) {
            elements.push(expression);
        }
        if ((token === null || token === void 0 ? void 0 : token.getType()) !== tokenize_1.TokenType.CLOSE_SEQUENCE) {
            throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Open sequence missing close sequence`);
        }
        return [new SequenceExpression_1.SequenceExpression(elements), token];
    }
    else if ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.OPEN_HASH) {
        let row = token.getRow(), column = token.getColumn();
        const hash = {};
        function readKeyPair() {
            if ((key === null || key === void 0 ? void 0 : key.getType()) !== tokenize_1.TokenType.STRING) {
                throw new TemplateError_1.TemplateError(row, column, `Hash missing key string`);
            }
            let colon = tokens.shift();
            if ((colon === null || colon === void 0 ? void 0 : colon.getType()) !== tokenize_1.TokenType.COLON) {
                throw new TemplateError_1.TemplateError(row, column, `Hash missing colon separator for key value pair`);
            }
            [expression, token] = interpretExpression(tokens);
            if (expression === undefined) {
                throw new TemplateError_1.TemplateError(row, column, `Expression for value in hash is empty`);
            }
            hash[key.getToken()] = expression;
        }
        let key = tokens.shift();
        if ((key === null || key === void 0 ? void 0 : key.getType()) === tokenize_1.TokenType.CLOSE_HASH) {
            return [new HashExpression_1.HashExpression(hash), token];
        }
        else {
            readKeyPair();
            while ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.COMMA) {
                key = tokens.shift();
                readKeyPair();
            }
        }
        if ((token === null || token === void 0 ? void 0 : token.getType()) !== tokenize_1.TokenType.CLOSE_HASH) {
            throw new TemplateError_1.TemplateError(row, column, `Open has  h missing close hash`);
        }
        return [new HashExpression_1.HashExpression(hash), token];
    }
    else {
        return [undefined, token];
    }
}
function isBinaryOperator(operator) {
    return operator.getType() === tokenize_1.TokenType.BANG ||
        operator.getType() === tokenize_1.TokenType.PLUS ||
        operator.getType() === tokenize_1.TokenType.MINUS ||
        operator.getType() === tokenize_1.TokenType.DIVIDE ||
        operator.getType() === tokenize_1.TokenType.MULTIPLY ||
        operator.getType() === tokenize_1.TokenType.MODULUS ||
        operator.getType() === tokenize_1.TokenType.EQUAL ||
        operator.getType() === tokenize_1.TokenType.NOT_EQUAL ||
        operator.getType() === tokenize_1.TokenType.AND ||
        operator.getType() === tokenize_1.TokenType.OR ||
        operator.getType() === tokenize_1.TokenType.LESS_THAN ||
        operator.getType() === tokenize_1.TokenType.GREATER_THAN ||
        operator.getType() === tokenize_1.TokenType.LESS_THAN_OR_EQUAL ||
        operator.getType() === tokenize_1.TokenType.GREATER_THAN_OR_EQUAL ||
        operator.getType() === tokenize_1.TokenType.ADD_AND_ASSIGN ||
        operator.getType() === tokenize_1.TokenType.SUBTRACT_AND_ASSIGN ||
        operator.getType() === tokenize_1.TokenType.MULTIPLY_AND_ASSIGN ||
        operator.getType() === tokenize_1.TokenType.DIVIDE_AND_ASSIGN ||
        operator.getType() === tokenize_1.TokenType.MODULUS_AND_ASSIGN ||
        operator.getType() === tokenize_1.TokenType.ASSIGN ||
        operator.getType() === tokenize_1.TokenType.DEREFERENCE ||
        operator.getType() === tokenize_1.TokenType.LAMBDA ||
        operator.getType() === tokenize_1.TokenType.RANGE_INCLUSIVE ||
        operator.getType() === tokenize_1.TokenType.RANGE_EXCLUSIVE ||
        operator.getType() === tokenize_1.TokenType.RANGE_LENGTH_DEC ||
        operator.getType() === tokenize_1.TokenType.RANGE_LENGTH_INC;
}
function buildBinaryExpression(operator, lhs, rhs) {
    if (operator.getType() === tokenize_1.TokenType.BANG) {
        return new DefaultExpression_1.DefaultExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.PLUS) {
        return new AdditionExpression_1.AdditionExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.MINUS) {
        return new SubstractionExpression_1.SubtractionExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.DIVIDE) {
        return new DivisionExpression_1.DivisionExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.MULTIPLY) {
        return new MultiplicationExpression_1.MultiplicationExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.MODULUS) {
        return new ModulusExpression_1.ModulusExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.EQUAL) {
        return new EqualExpression_1.EqualExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.NOT_EQUAL) {
        return new NotEqualExpression_1.NotEqualExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.AND) {
        return new AndExpression_1.AndExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.OR) {
        return new OrExpression_1.OrExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.LESS_THAN) {
        return new LessThanExpression_1.LessThanExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.GREATER_THAN) {
        return new GreaterThanExpression_1.GreaterThanExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.LESS_THAN_OR_EQUAL) {
        return new LessThanOrEqualExpression_1.LessThanOrEqualExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.GREATER_THAN_OR_EQUAL) {
        return new GreaterThanOrEqualExpression_1.GreaterThanOrEqualExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.ADD_AND_ASSIGN) {
        return new AddAndAssignExpression_1.AddAndAssignExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.SUBTRACT_AND_ASSIGN) {
        return new SubstractAndAssignExpression_1.SubtractAndAssignExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.MULTIPLY_AND_ASSIGN) {
        return new MultiplyAndAssignExpression_1.MultiplyAndAssignExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.DIVIDE_AND_ASSIGN) {
        return new DivideAndAssignExpression_1.DivideAndAssignExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.MODULUS_AND_ASSIGN) {
        return new ModulusAndAssignExpression_1.ModulusAndAssignExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.ASSIGN) {
        return new AssignExpression_1.AssignExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.DEREFERENCE) {
        return new DereferenceExpression_1.DereferenceExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.LAMBDA) {
        return new LambdaExpression_1.LambdaExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_INCLUSIVE) {
        return new RangeInclusiveExpression_1.RangeInclusiveExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_EXCLUSIVE) {
        return new RangeExclusiveExpression_1.RangeExclusiveExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_LENGTH_INC) {
        return new RangeLengthIncrementExpression_1.RangeLengthIncrementExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_LENGTH_DEC) {
        return new RangeLengthDecrementExpression_1.RangeLengthDecrementExpression(lhs, rhs, operator.getRow(), operator.getColumn());
    }
    else {
        throw new TemplateError_1.TemplateError(operator.getRow(), operator.getColumn(), `Unknown token type '${operator.getType()}'`);
    }
}
function interpretSlice(tokens) {
    let [expression, token] = interpretOperand(tokens);
    if (expression === undefined) {
        throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Empty range arguments to slice operator`);
    }
    const operator = tokens.shift();
    if (operator.getType() === tokenize_1.TokenType.CLOSE_SEQUENCE) {
        return expression;
    }
    const rhs = tokens.shift();
    if (rhs.getType() === tokenize_1.TokenType.CLOSE_SEQUENCE && operator.getType() === tokenize_1.TokenType.RANGE_INCLUSIVE) {
        return new RangeStartingExpression_1.RangeStartingExpression(expression, operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_INCLUSIVE) {
        expression = new RangeInclusiveExpression_1.RangeInclusiveExpression(expression, new NumberExpression_1.NumberExpression(rhs.getToken(), rhs.getRow(), rhs.getColumn()), operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_EXCLUSIVE) {
        expression = new RangeExclusiveExpression_1.RangeExclusiveExpression(expression, new NumberExpression_1.NumberExpression(rhs.getToken(), rhs.getRow(), rhs.getColumn()), operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_LENGTH_INC) {
        expression = new RangeLengthIncrementExpression_1.RangeLengthIncrementExpression(expression, new NumberExpression_1.NumberExpression(rhs.getToken(), rhs.getRow(), rhs.getColumn()), operator.getRow(), operator.getColumn());
    }
    else if (operator.getType() === tokenize_1.TokenType.RANGE_LENGTH_DEC) {
        expression = new RangeLengthDecrementExpression_1.RangeLengthDecrementExpression(expression, new NumberExpression_1.NumberExpression(rhs.getToken(), rhs.getRow(), rhs.getColumn()), operator.getRow(), operator.getColumn());
    }
    else {
        throw new TemplateError_1.TemplateError(operator.getRow(), operator.getColumn(), `Invalid range specification`);
    }
    const close = tokens.shift();
    if (close.getType() !== tokenize_1.TokenType.CLOSE_SEQUENCE) {
        throw new TemplateError_1.TemplateError(close.getRow(), close.getColumn(), `Close sequence expected`);
    }
    return expression;
}
function interpretFunctionArguments(tokens) {
    const result = [];
    let expression, token;
    [expression, token] = interpretExpression(tokens);
    while ((token === null || token === void 0 ? void 0 : token.getType()) === tokenize_1.TokenType.COMMA) {
        if (expression) {
            result.push(expression);
        }
        else {
            throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), "Expected expression preceding comma in function arguments");
        }
        [expression, token] = interpretExpression(tokens);
    }
    if (expression) {
        result.push(expression);
    }
    return result;
}
function interpretExpression(tokens) {
    let [expression, token] = interpretOperand(tokens);
    if (expression === undefined) {
        return [undefined, token];
    }
    while (tokens.length) {
        const operator = tokens.shift();
        if (expression === undefined) {
            throw new TemplateError_1.TemplateError(operator.getRow(), operator.getColumn(), `Binary operator expects lhs expression`);
        }
        if (operator.getType() === tokenize_1.TokenType.CLOSE_PARENTHESIS) {
            return [expression, operator];
        }
        if (operator.getType() === tokenize_1.TokenType.COMMA) {
            return [expression, operator];
        }
        if (operator.getType() === tokenize_1.TokenType.CLOSE_SEQUENCE) {
            return [expression, operator];
        }
        if (operator.getType() === tokenize_1.TokenType.CLOSE_HASH) {
            return [expression, operator];
        }
        if (operator.getType() === tokenize_1.TokenType.CALL_METHOD) {
            const args = interpretFunctionArguments(tokens);
            expression = walkUpLeftByPrecedence(operator, expression, (lhs) => new CallMethodExpression_1.CallMethodExpression(lhs, args, operator.getRow(), operator.getColumn()));
            continue;
        }
        if (operator.getType() === tokenize_1.TokenType.CALL_BUILTIN) {
            const name = tokens.shift();
            let args = [];
            if (tokens.length && tokens[0].getType() === tokenize_1.TokenType.CALL_METHOD) {
                tokens.shift();
                args = interpretFunctionArguments(tokens);
            }
            expression = walkUpLeftByPrecedence(operator, expression, (lhs) => new CallBuiltinExpression_1.CallBuiltinExpression(lhs, name.getToken(), args, operator.getRow(), operator.getColumn()));
            continue;
        }
        if (operator.getType() === tokenize_1.TokenType.OPEN_SLICE) {
            const slice = interpretSlice(tokens);
            expression = walkUpLeftByPrecedence(operator, expression, (lhs) => new SliceExpression_1.SliceExpression(lhs, slice, operator.getRow(), operator.getColumn()));
            continue;
        }
        if (operator.getType() === tokenize_1.TokenType.IS_DEFINED) {
            expression = new IsDefinedExpression_1.IsDefinedExpression(expression, operator.getRow(), operator.getColumn());
            continue;
        }
        if (operator.getType() === tokenize_1.TokenType.PLUS_PLUS) {
            expression = new IncrementExpression_1.IncrementExpression(expression, operator.getRow(), operator.getColumn());
            continue;
        }
        if (operator.getType() === tokenize_1.TokenType.MINUS_MINUS) {
            expression = new DecrementExpression_1.DecrementExpression(expression, operator.getRow(), operator.getColumn());
            continue;
        }
        if (!isBinaryOperator(operator)) {
            tokens.unshift(operator);
            const [ancillary, token] = interpretOperand(tokens);
            expression = new AncillaryExpression_1.AncillaryExpression(expression, ancillary, operator.getRow(), operator.getColumn());
            continue;
        }
        let rhs = undefined;
        if (tokens.length === 0 && operator.getType() === tokenize_1.TokenType.BANG) {
            rhs = new StringExpression_1.StringExpression("", token.getRow(), token.getColumn());
        }
        else {
            [rhs, token] = interpretOperand(tokens);
            if (operator.getType() === tokenize_1.TokenType.BANG && rhs === undefined) {
                tokens.unshift(token);
                rhs = new StringExpression_1.StringExpression("", token.getRow(), token.getColumn());
            }
            if (rhs === undefined) {
                throw new TemplateError_1.TemplateError(token.getRow(), token.getColumn(), `Binary operator expects rhs expression`);
            }
        }
        expression = walkUpLeftByPrecedence(operator, expression, (lhs) => buildBinaryExpression(operator, lhs, rhs));
    }
    return [expression, undefined];
}
function walkUpLeftByPrecedence(operator, subject, builder) {
    if ((0, ComposingExpression_1.isComposingExpression)(subject) && PRECEDENCE[operator.getToken()] < PRECEDENCE[subject.getOperator()]) {
        let current = subject;
        let next = current.getSubject();
        while ((0, ComposingExpression_1.isComposingExpression)(next) && PRECEDENCE[operator.getToken()] < PRECEDENCE[next.getOperator()]) {
            current = next;
            next = current.getSubject();
        }
        current.replaceSubject(builder(current.getSubject()));
        return subject;
    }
    else {
        return builder(subject);
    }
}
class ExpressionEngine {
    build(text, row, column) {
        const tokens = (0, tokenize_1.tokenize)(text, row, column);
        const [expression, token] = interpretExpression(tokens);
        if (expression === undefined) {
            throw new TemplateError_1.TemplateError(row, column, `Expression is empty`);
        }
        if (token !== undefined) {
            throw new TemplateError_1.TemplateError(row, column, `Expression terminated incorrectly`);
        }
        return expression;
    }
}
exports.ExpressionEngine = ExpressionEngine;


/***/ }),

/***/ "./lib/freemarker/expression/AddAndAssignExpression.ts":
/*!*************************************************************!*\
  !*** ./lib/freemarker/expression/AddAndAssignExpression.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AddAndAssignExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class AddAndAssignExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '+=';
    }
    evaluate(data) {
        const current = this.lhs.evaluate(data);
        current.assign(current.retrieve() + this.rhs.evaluate(data).retrieve());
        return Value_1.Literal.of(undefined);
    }
}
exports.AddAndAssignExpression = AddAndAssignExpression;


/***/ }),

/***/ "./lib/freemarker/expression/AdditionExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/AdditionExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AdditionExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
const isHash_1 = __webpack_require__(/*! ../../utilities/isHash */ "./lib/utilities/isHash.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class AdditionExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '+';
    }
    evaluate(data) {
        const lhs = this.lhs.evaluate(data).retrieve();
        const rhs = this.rhs.evaluate(data).retrieve();
        if (typeof lhs === 'string' || typeof rhs === "string") {
            return Value_1.Literal.of(lhs + rhs);
        }
        else if (typeof lhs === 'number' && typeof rhs === 'number') {
            return Value_1.Literal.of(lhs + rhs);
        }
        else if (Array.isArray(lhs) && Array.isArray(rhs)) {
            return Value_1.Literal.of([...lhs, ...rhs]);
        }
        else if ((0, isHash_1.isHash)(lhs) && (0, isHash_1.isHash)(rhs)) {
            return Value_1.Literal.of(Object.assign(Object.assign({}, lhs), rhs));
        }
        else {
            throw new TemplateError_1.TemplateError(this.row, this.column, `Invalid operands for addition`);
        }
    }
}
exports.AdditionExpression = AdditionExpression;


/***/ }),

/***/ "./lib/freemarker/expression/AncillaryExpression.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/expression/AncillaryExpression.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AncillaryExpression = void 0;
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class AncillaryExpression extends ComposingExpression_1.ComposingExpression {
    constructor(ancillary, subject, row, column) {
        super(subject, row, column);
        this.ancillary = ancillary;
    }
    evaluate(data) {
        this.ancillary.evaluate(data);
        return this.subject.evaluate(data);
    }
    getOperator() {
        return 'ancilliary';
    }
}
exports.AncillaryExpression = AncillaryExpression;


/***/ }),

/***/ "./lib/freemarker/expression/AndExpression.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/expression/AndExpression.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AndExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class AndExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '&&';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() && this.rhs.evaluate(data).retrieve());
    }
}
exports.AndExpression = AndExpression;


/***/ }),

/***/ "./lib/freemarker/expression/AssignExpression.ts":
/*!*******************************************************!*\
  !*** ./lib/freemarker/expression/AssignExpression.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AssignExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class AssignExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '=';
    }
    evaluate(data) {
        const lhs = this.lhs.evaluate(data);
        lhs.assign(this.rhs.evaluate(data).retrieve());
        return Value_1.Literal.of(undefined);
    }
}
exports.AssignExpression = AssignExpression;


/***/ }),

/***/ "./lib/freemarker/expression/BinaryExpression.ts":
/*!*******************************************************!*\
  !*** ./lib/freemarker/expression/BinaryExpression.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.BinaryExpression = void 0;
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class BinaryExpression extends ComposingExpression_1.ComposingExpression {
    constructor(lhs, rhs, row, column) {
        super(rhs, row, column);
        this.lhs = lhs;
        this.rhs = rhs;
        this.row = row;
        this.column = column;
    }
    getSubject() {
        return this.rhs;
    }
    replaceSubject(expression) {
        this.rhs = expression;
    }
}
exports.BinaryExpression = BinaryExpression;


/***/ }),

/***/ "./lib/freemarker/expression/CallBuiltinExpression.ts":
/*!************************************************************!*\
  !*** ./lib/freemarker/expression/CallBuiltinExpression.ts ***!
  \************************************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallBuiltinExpression = void 0;
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const Builtins = __importStar(__webpack_require__(/*! ../builtin */ "./lib/freemarker/builtin/index.ts"));
class CallBuiltinExpression {
    constructor(subject, name, args, row, column) {
        this.subject = subject;
        this.name = name;
        this.args = args;
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        const exp = this.subject.evaluate(data);
        const isLoopVariable = (exp instanceof Value_1.Reference && Object.keys(data).includes(`$${exp.getName()}$`));
        if (isLoopVariable) {
            if (this.name === 'counter') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `counter builtin requires no arguments`);
                }
                return Value_1.Literal.of(data[`$${exp.getName()}_index$`] + 1);
            }
            else if (this.name === 'index') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `index builtin requires no arguments`);
                }
                return Value_1.Literal.of(data[`$${exp.getName()}_index$`]);
            }
            else if (this.name === 'has_next') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `has_next builtin requires no arguments`);
                }
                return Value_1.Literal.of(data[`$${exp.getName()}_index$`] < data[`$${exp.getName()}_length$`] - 1);
            }
            else if (this.name === 'is_last') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `is_last builtin requires no arguments`);
                }
                const index = data[`$${exp.getName()}_index$`];
                const length = data[`$${exp.getName()}_length$`];
                return Value_1.Literal.of(index === length - 1);
            }
            else if (this.name === 'is_first') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `is_first builtin requires no arguments`);
                }
                return Value_1.Literal.of(data[`$${exp.getName()}_index$`] === 0);
            }
            else if (this.name === 'is_even_item') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `is_even_item builtin requires no arguments`);
                }
                return Value_1.Literal.of((data[`$${exp.getName()}_index$`] + 1) % 2 === 0);
            }
            else if (this.name === 'is_odd_item') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `is_odd_item builtin requires no arguments`);
                }
                return Value_1.Literal.of(data[`$${exp.getName()}_index$`] % 2 === 0);
            }
            else if (this.name === 'item_cycle') {
                if (this.args.length === 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `item_cycle builtin requires at least one argument`);
                }
                const args = this.args.map(a => a.evaluate(data).retrieve());
                return Value_1.Literal.of(args[data[`$${exp.getName()}_index$`] % args.length]);
            }
            else if (this.name === 'item_parity') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `item_parity builtin requires no arguments`);
                }
                return Value_1.Literal.of((data[`$${exp.getName()}_index$`] + 1) % 2 === 0 ? "even" : "odd");
            }
            else if (this.name === 'item_parity_cap') {
                if (this.args.length !== 0) {
                    throw new TemplateError_1.TemplateError(this.row, this.column, `item_parity_cap builtin requires no arguments`);
                }
                return Value_1.Literal.of((data[`$${exp.getName()}_index$`] + 1) % 2 === 0 ? "Even" : "Odd");
            }
            else {
                throw new TemplateError_1.TemplateError(this.row, this.column, `Unsupported builtin (${this.name}) for subject ${this.row}:${this.column}`);
            }
        }
        const subject = exp.retrieve();
        const builtin = Builtins.find(subject, this.name);
        if (builtin) {
            return builtin.calculate(subject, this.args, data, this.row, this.column);
        }
        else {
            throw new TemplateError_1.TemplateError(this.row, this.column, `Unsupported builtin (${this.name}) for subject ${this.row}:${this.column}`);
        }
    }
}
exports.CallBuiltinExpression = CallBuiltinExpression;


/***/ }),

/***/ "./lib/freemarker/expression/CallMethodExpression.ts":
/*!***********************************************************!*\
  !*** ./lib/freemarker/expression/CallMethodExpression.ts ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CallMethodExpression = void 0;
const ReferenceExpression_1 = __webpack_require__(/*! ./ReferenceExpression */ "./lib/freemarker/expression/ReferenceExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const DereferenceExpression_1 = __webpack_require__(/*! ./DereferenceExpression */ "./lib/freemarker/expression/DereferenceExpression.ts");
class CallMethodExpression {
    constructor(reference, args, row, column) {
        this.reference = reference;
        this.args = args;
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        if (this.reference instanceof ReferenceExpression_1.ReferenceExpression) {
            const method = this.reference.evaluate(data).retrieve();
            return Value_1.Literal.of(method(...this.args.map(arg => arg.evaluate(data).retrieve())));
        }
        else if (this.reference instanceof DereferenceExpression_1.DereferenceExpression) {
            const method = this.reference.evaluate(data).retrieve();
            return Value_1.Literal.of(method(...this.args.map(arg => arg.evaluate(data).retrieve())));
        }
        else {
            throw new TemplateError_1.TemplateError(this.row, this.column, `Invalid subject of method call, expected reference resolving to a method.`);
        }
    }
}
exports.CallMethodExpression = CallMethodExpression;


/***/ }),

/***/ "./lib/freemarker/expression/ComposingExpression.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/expression/ComposingExpression.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isComposingExpression = exports.ComposingExpression = void 0;
class ComposingExpression {
    constructor(subject, row, column) {
        this.subject = subject;
        this.row = row;
        this.column = column;
    }
    getSubject() {
        return this.subject;
    }
    replaceSubject(expression) {
        this.subject = expression;
    }
}
exports.ComposingExpression = ComposingExpression;
function isComposingExpression(test) {
    return test instanceof ComposingExpression;
}
exports.isComposingExpression = isComposingExpression;


/***/ }),

/***/ "./lib/freemarker/expression/DecrementExpression.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/expression/DecrementExpression.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DecrementExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class DecrementExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        const current = this.subject.evaluate(data);
        const original = current.retrieve();
        current.assign(original - 1);
        return Value_1.Literal.of(undefined);
    }
    getOperator() {
        return '--';
    }
}
exports.DecrementExpression = DecrementExpression;


/***/ }),

/***/ "./lib/freemarker/expression/DefaultExpression.ts":
/*!********************************************************!*\
  !*** ./lib/freemarker/expression/DefaultExpression.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DefaultExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const ReferenceNotFoundError_1 = __webpack_require__(/*! ../ReferenceNotFoundError */ "./lib/freemarker/ReferenceNotFoundError.ts");
class DefaultExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return 'default';
    }
    evaluate(data) {
        try {
            const lhs = this.lhs.evaluate(data);
            if (lhs.retrieve() === undefined) {
                return this.rhs.evaluate(data);
            }
            return lhs;
        }
        catch (err) {
            if (err instanceof ReferenceNotFoundError_1.ReferenceNotFoundError) {
                return this.rhs.evaluate(data);
            }
            throw err;
        }
    }
}
exports.DefaultExpression = DefaultExpression;


/***/ }),

/***/ "./lib/freemarker/expression/DereferenceExpression.ts":
/*!************************************************************!*\
  !*** ./lib/freemarker/expression/DereferenceExpression.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DereferenceExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
const isHash_1 = __webpack_require__(/*! ../../utilities/isHash */ "./lib/utilities/isHash.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class DereferenceExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '.';
    }
    evaluate(data) {
        const obj = this.lhs.evaluate(data).retrieve();
        if (obj === undefined) {
            throw new TemplateError_1.TemplateError(this.row, this.column, `Subject is undefined for dereference operator`);
        }
        if (!(0, isHash_1.isHash)(obj)) {
            throw new TemplateError_1.TemplateError(this.row, this.column, `Invalid subject for dereference operator`);
        }
        const value = this.rhs.evaluate(obj).retrieve();
        if (typeof value === "function") {
            return Value_1.Literal.of(function () {
                return value.call(obj, ...arguments);
            });
        }
        return Value_1.Literal.of(value);
    }
}
exports.DereferenceExpression = DereferenceExpression;


/***/ }),

/***/ "./lib/freemarker/expression/DivideAndAssignExpression.ts":
/*!****************************************************************!*\
  !*** ./lib/freemarker/expression/DivideAndAssignExpression.ts ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DivideAndAssignExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class DivideAndAssignExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '/=';
    }
    evaluate(data) {
        const current = this.lhs.evaluate(data);
        current.assign(current.retrieve() / this.rhs.evaluate(data).retrieve());
        return Value_1.Literal.of(undefined);
    }
}
exports.DivideAndAssignExpression = DivideAndAssignExpression;


/***/ }),

/***/ "./lib/freemarker/expression/DivisionExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/DivisionExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DivisionExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class DivisionExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '/';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() / this.rhs.evaluate(data).retrieve());
    }
}
exports.DivisionExpression = DivisionExpression;


/***/ }),

/***/ "./lib/freemarker/expression/EqualExpression.ts":
/*!******************************************************!*\
  !*** ./lib/freemarker/expression/EqualExpression.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.EqualExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class EqualExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '==';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() === this.rhs.evaluate(data).retrieve());
    }
}
exports.EqualExpression = EqualExpression;


/***/ }),

/***/ "./lib/freemarker/expression/FalseExpression.ts":
/*!******************************************************!*\
  !*** ./lib/freemarker/expression/FalseExpression.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.FalseExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class FalseExpression {
    constructor(row, column) {
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        return Value_1.Literal.of(false);
    }
}
exports.FalseExpression = FalseExpression;


/***/ }),

/***/ "./lib/freemarker/expression/GreaterThanExpression.ts":
/*!************************************************************!*\
  !*** ./lib/freemarker/expression/GreaterThanExpression.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GreaterThanExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class GreaterThanExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '>';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() > this.rhs.evaluate(data).retrieve());
    }
}
exports.GreaterThanExpression = GreaterThanExpression;


/***/ }),

/***/ "./lib/freemarker/expression/GreaterThanOrEqualExpression.ts":
/*!*******************************************************************!*\
  !*** ./lib/freemarker/expression/GreaterThanOrEqualExpression.ts ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GreaterThanOrEqualExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class GreaterThanOrEqualExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '>=';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() >= this.rhs.evaluate(data).retrieve());
    }
}
exports.GreaterThanOrEqualExpression = GreaterThanOrEqualExpression;


/***/ }),

/***/ "./lib/freemarker/expression/HashExpression.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/expression/HashExpression.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.HashExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class HashExpression {
    constructor(hash) {
        this.hash = hash;
    }
    evaluate(data) {
        const result = {};
        for (const [key, expression] of Object.entries(this.hash)) {
            result[key] = expression.evaluate(data).retrieve();
        }
        return Value_1.Literal.of(result);
    }
}
exports.HashExpression = HashExpression;


/***/ }),

/***/ "./lib/freemarker/expression/IncrementExpression.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/expression/IncrementExpression.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IncrementExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class IncrementExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        const current = this.subject.evaluate(data);
        const original = current.retrieve();
        current.assign(original + 1);
        return Value_1.Literal.of(undefined);
    }
    getOperator() {
        return '++';
    }
}
exports.IncrementExpression = IncrementExpression;


/***/ }),

/***/ "./lib/freemarker/expression/IsDefinedExpression.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/expression/IsDefinedExpression.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.IsDefinedExpression = void 0;
const ReferenceNotFoundError_1 = __webpack_require__(/*! ../ReferenceNotFoundError */ "./lib/freemarker/ReferenceNotFoundError.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class IsDefinedExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        try {
            const subject = this.subject.evaluate(data).retrieve();
            return Value_1.Literal.of(!(subject === undefined || subject === null));
        }
        catch (err) {
            if (err instanceof ReferenceNotFoundError_1.ReferenceNotFoundError) {
                return Value_1.Literal.of(false);
            }
            throw err;
        }
    }
    getOperator() {
        return '??';
    }
}
exports.IsDefinedExpression = IsDefinedExpression;


/***/ }),

/***/ "./lib/freemarker/expression/LambdaExpression.ts":
/*!*******************************************************!*\
  !*** ./lib/freemarker/expression/LambdaExpression.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LambdaExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
class LambdaExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '->';
    }
    evaluate(data) {
        const local = Object.assign({}, data);
        const lhs = this.lhs.evaluate(local);
        lhs.assign(data['$$']);
        return this.rhs.evaluate(local);
    }
}
exports.LambdaExpression = LambdaExpression;


/***/ }),

/***/ "./lib/freemarker/expression/LessThanExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/LessThanExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LessThanExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class LessThanExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '<';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() < this.rhs.evaluate(data).retrieve());
    }
}
exports.LessThanExpression = LessThanExpression;


/***/ }),

/***/ "./lib/freemarker/expression/LessThanOrEqualExpression.ts":
/*!****************************************************************!*\
  !*** ./lib/freemarker/expression/LessThanOrEqualExpression.ts ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LessThanOrEqualExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class LessThanOrEqualExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '<';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() <= this.rhs.evaluate(data).retrieve());
    }
}
exports.LessThanOrEqualExpression = LessThanOrEqualExpression;


/***/ }),

/***/ "./lib/freemarker/expression/ModulusAndAssignExpression.ts":
/*!*****************************************************************!*\
  !*** ./lib/freemarker/expression/ModulusAndAssignExpression.ts ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ModulusAndAssignExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class ModulusAndAssignExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '%=';
    }
    evaluate(data) {
        const current = this.lhs.evaluate(data);
        current.assign(current.retrieve() % this.rhs.evaluate(data).retrieve());
        return Value_1.Literal.of(undefined);
    }
}
exports.ModulusAndAssignExpression = ModulusAndAssignExpression;


/***/ }),

/***/ "./lib/freemarker/expression/ModulusExpression.ts":
/*!********************************************************!*\
  !*** ./lib/freemarker/expression/ModulusExpression.ts ***!
  \********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ModulusExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class ModulusExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '%';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() % this.rhs.evaluate(data).retrieve());
    }
}
exports.ModulusExpression = ModulusExpression;


/***/ }),

/***/ "./lib/freemarker/expression/MultiplicationExpression.ts":
/*!***************************************************************!*\
  !*** ./lib/freemarker/expression/MultiplicationExpression.ts ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MultiplicationExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class MultiplicationExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '*';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() * this.rhs.evaluate(data).retrieve());
    }
}
exports.MultiplicationExpression = MultiplicationExpression;


/***/ }),

/***/ "./lib/freemarker/expression/MultiplyAndAssignExpression.ts":
/*!******************************************************************!*\
  !*** ./lib/freemarker/expression/MultiplyAndAssignExpression.ts ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MultiplyAndAssignExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class MultiplyAndAssignExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '*=';
    }
    evaluate(data) {
        const current = this.lhs.evaluate(data);
        current.assign(current.retrieve() * this.rhs.evaluate(data).retrieve());
        return Value_1.Literal.of(undefined);
    }
}
exports.MultiplyAndAssignExpression = MultiplyAndAssignExpression;


/***/ }),

/***/ "./lib/freemarker/expression/NegativeExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/NegativeExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NegativeExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class NegativeExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        return Value_1.Literal.of(-1 * this.subject.evaluate(data).retrieve());
    }
    getOperator() {
        return '-';
    }
}
exports.NegativeExpression = NegativeExpression;


/***/ }),

/***/ "./lib/freemarker/expression/NotEqualExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/NotEqualExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotEqualExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class NotEqualExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '!=';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() != this.rhs.evaluate(data).retrieve());
    }
}
exports.NotEqualExpression = NotEqualExpression;


/***/ }),

/***/ "./lib/freemarker/expression/NotExpression.ts":
/*!****************************************************!*\
  !*** ./lib/freemarker/expression/NotExpression.ts ***!
  \****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NotExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class NotExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        return Value_1.Literal.of(!this.subject.evaluate(data).retrieve());
    }
    getOperator() {
        return 'not';
    }
}
exports.NotExpression = NotExpression;


/***/ }),

/***/ "./lib/freemarker/expression/NumberExpression.ts":
/*!*******************************************************!*\
  !*** ./lib/freemarker/expression/NumberExpression.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.NumberExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class NumberExpression {
    constructor(subject, row, column) {
        this.subject = subject;
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        return Value_1.Literal.of(Number(this.subject));
    }
}
exports.NumberExpression = NumberExpression;


/***/ }),

/***/ "./lib/freemarker/expression/OrExpression.ts":
/*!***************************************************!*\
  !*** ./lib/freemarker/expression/OrExpression.ts ***!
  \***************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.OrExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class OrExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '||';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() || this.rhs.evaluate(data).retrieve());
    }
}
exports.OrExpression = OrExpression;


/***/ }),

/***/ "./lib/freemarker/expression/ParenthesisExpression.ts":
/*!************************************************************!*\
  !*** ./lib/freemarker/expression/ParenthesisExpression.ts ***!
  \************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ParenthesisExpression = void 0;
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class ParenthesisExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        return this.subject.evaluate(data);
    }
    getOperator() {
        return '(';
    }
}
exports.ParenthesisExpression = ParenthesisExpression;


/***/ }),

/***/ "./lib/freemarker/expression/PositiveExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/PositiveExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PositiveExpression = void 0;
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class PositiveExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        return this.subject.evaluate(data);
    }
    getOperator() {
        return '+';
    }
}
exports.PositiveExpression = PositiveExpression;


/***/ }),

/***/ "./lib/freemarker/expression/RangeExclusiveExpression.ts":
/*!***************************************************************!*\
  !*** ./lib/freemarker/expression/RangeExclusiveExpression.ts ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RangeExclusiveExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class RangeExclusiveExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '..';
    }
    evaluate(data) {
        const result = [];
        const lhs = this.lhs.evaluate(data).retrieve();
        const rhs = this.rhs.evaluate(data).retrieve();
        if (lhs < rhs) {
            for (let i = lhs; i < rhs; i++) {
                result.push(i);
            }
        }
        else if (lhs > rhs) {
            for (let i = lhs; i > rhs; i--) {
                result.push(i);
            }
        }
        else {
            result.push(lhs);
        }
        return Value_1.Literal.of(result);
    }
}
exports.RangeExclusiveExpression = RangeExclusiveExpression;


/***/ }),

/***/ "./lib/freemarker/expression/RangeInclusiveExpression.ts":
/*!***************************************************************!*\
  !*** ./lib/freemarker/expression/RangeInclusiveExpression.ts ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RangeInclusiveExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class RangeInclusiveExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '..';
    }
    evaluate(data) {
        const result = [];
        const lhs = this.lhs.evaluate(data).retrieve();
        const rhs = this.rhs.evaluate(data).retrieve();
        if (lhs < rhs) {
            for (let i = lhs; i <= rhs; i++) {
                result.push(i);
            }
        }
        else if (lhs > rhs) {
            for (let i = lhs; i >= rhs; i--) {
                result.push(i);
            }
        }
        else {
            result.push(lhs);
        }
        return Value_1.Literal.of(result);
    }
}
exports.RangeInclusiveExpression = RangeInclusiveExpression;


/***/ }),

/***/ "./lib/freemarker/expression/RangeLengthDecrementExpression.ts":
/*!*********************************************************************!*\
  !*** ./lib/freemarker/expression/RangeLengthDecrementExpression.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RangeLengthDecrementExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class RangeLengthDecrementExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '..';
    }
    evaluate(data) {
        const result = [];
        const start = this.lhs.evaluate(data).retrieve();
        const length = this.rhs.evaluate(data).retrieve();
        for (let i = 0; i < length; i++) {
            result.push(start - i);
        }
        return Value_1.Literal.of(result);
    }
}
exports.RangeLengthDecrementExpression = RangeLengthDecrementExpression;


/***/ }),

/***/ "./lib/freemarker/expression/RangeLengthIncrementExpression.ts":
/*!*********************************************************************!*\
  !*** ./lib/freemarker/expression/RangeLengthIncrementExpression.ts ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RangeLengthIncrementExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class RangeLengthIncrementExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '..';
    }
    evaluate(data) {
        const result = [];
        const start = this.lhs.evaluate(data).retrieve();
        const length = this.rhs.evaluate(data).retrieve();
        for (let i = 0; i < length; i++) {
            result.push(start + i);
        }
        return Value_1.Literal.of(result);
    }
}
exports.RangeLengthIncrementExpression = RangeLengthIncrementExpression;


/***/ }),

/***/ "./lib/freemarker/expression/RangeStartingExpression.ts":
/*!**************************************************************!*\
  !*** ./lib/freemarker/expression/RangeStartingExpression.ts ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.RangeStartingExpression = void 0;
const ComposingExpression_1 = __webpack_require__(/*! ./ComposingExpression */ "./lib/freemarker/expression/ComposingExpression.ts");
class RangeStartingExpression extends ComposingExpression_1.ComposingExpression {
    evaluate(data) {
        return this.subject.evaluate(data);
    }
    getOperator() {
        return '[';
    }
}
exports.RangeStartingExpression = RangeStartingExpression;


/***/ }),

/***/ "./lib/freemarker/expression/ReferenceExpression.ts":
/*!**********************************************************!*\
  !*** ./lib/freemarker/expression/ReferenceExpression.ts ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ReferenceExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class ReferenceExpression {
    constructor(reference, row, column) {
        this.reference = reference;
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        return Value_1.Reference.of(this.reference, data);
    }
}
exports.ReferenceExpression = ReferenceExpression;


/***/ }),

/***/ "./lib/freemarker/expression/SequenceExpression.ts":
/*!*********************************************************!*\
  !*** ./lib/freemarker/expression/SequenceExpression.ts ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SequenceExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class SequenceExpression {
    constructor(elements) {
        this.elements = elements;
    }
    evaluate(data) {
        return Value_1.Literal.of(this.elements.map(el => el.evaluate(data).retrieve()));
    }
}
exports.SequenceExpression = SequenceExpression;


/***/ }),

/***/ "./lib/freemarker/expression/SliceExpression.ts":
/*!******************************************************!*\
  !*** ./lib/freemarker/expression/SliceExpression.ts ***!
  \******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SliceExpression = void 0;
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
const RangeStartingExpression_1 = __webpack_require__(/*! ./RangeStartingExpression */ "./lib/freemarker/expression/RangeStartingExpression.ts");
const RangeLengthIncrementExpression_1 = __webpack_require__(/*! ./RangeLengthIncrementExpression */ "./lib/freemarker/expression/RangeLengthIncrementExpression.ts");
const RangeLengthDecrementExpression_1 = __webpack_require__(/*! ./RangeLengthDecrementExpression */ "./lib/freemarker/expression/RangeLengthDecrementExpression.ts");
const isHash_1 = __webpack_require__(/*! ../../utilities/isHash */ "./lib/utilities/isHash.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
class SliceExpression extends BinaryExpression_1.BinaryExpression {
    evaluate(data) {
        const subject = this.lhs.evaluate(data).retrieve();
        const arg = this.rhs.evaluate(data).retrieve();
        const lenient = this.rhs instanceof RangeLengthIncrementExpression_1.RangeLengthIncrementExpression || this.rhs instanceof RangeLengthDecrementExpression_1.RangeLengthDecrementExpression;
        if (Array.isArray(subject)) {
            if (this.rhs instanceof RangeStartingExpression_1.RangeStartingExpression) {
                return Value_1.Literal.of(subject.slice(arg));
            }
            else if (Array.isArray(arg)) {
                const result = [];
                for (const index of arg) {
                    if (index >= 0 && index < subject.length) {
                        result.push(subject[index]);
                    }
                    else if (!lenient) {
                        throw new TemplateError_1.TemplateError(this.row, this.column, `Invalid index for slice`);
                    }
                }
                return Value_1.Literal.of(result);
            }
            else if (typeof arg === "number") {
                return Value_1.Literal.of(subject[arg]);
            }
            else {
                throw new TemplateError_1.TemplateError(this.row, this.column, `Unsupported arg of slice`);
            }
        }
        else if ((0, isHash_1.isHash)(subject)) {
            if (typeof arg === "string") {
                return Value_1.Literal.of(subject[arg]);
            }
            else {
                throw new TemplateError_1.TemplateError(this.row, this.column, `Unsupported arg of slice when applied to hash`);
            }
        }
        else if (typeof subject === "string") {
            if (this.rhs instanceof RangeStartingExpression_1.RangeStartingExpression) {
                return Value_1.Literal.of(subject.slice(arg));
            }
            else if (Array.isArray(arg)) {
                const result = [];
                for (const index of arg) {
                    if (index >= 0 && index < subject.length) {
                        result.push(subject.charAt(index));
                    }
                    else if (!lenient) {
                        throw new TemplateError_1.TemplateError(this.row, this.column, `Invalid index for slice`);
                    }
                }
                return Value_1.Literal.of(result.join(""));
            }
            else if (typeof arg === "number") {
                return Value_1.Literal.of(subject.charAt(arg));
            }
            else {
                throw new TemplateError_1.TemplateError(this.row, this.column, `Unsupported arg of slice`);
            }
        }
        else {
            throw new TemplateError_1.TemplateError(this.row, this.column, `Unsupported subject of slice`);
        }
    }
    getOperator() {
        return 'slice';
    }
}
exports.SliceExpression = SliceExpression;


/***/ }),

/***/ "./lib/freemarker/expression/StringExpression.ts":
/*!*******************************************************!*\
  !*** ./lib/freemarker/expression/StringExpression.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.StringExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
const StringBuffer_1 = __webpack_require__(/*! ../../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const expression_engine_1 = __webpack_require__(/*! ../expression-engine */ "./lib/freemarker/expression-engine.ts");
var Stage;
(function (Stage) {
    Stage[Stage["OPEN"] = 0] = "OPEN";
    Stage[Stage["INTERPOLATION"] = 1] = "INTERPOLATION";
})(Stage || (Stage = {}));
class StringExpression {
    constructor(str, row, column) {
        this.str = str;
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        const reader = new StringBuffer_1.StringBuffer(this.str, this.row, this.column);
        let result = new StringBuffer_1.StringBuffer();
        let writer = new StringBuffer_1.StringBuffer();
        let column, row;
        let stage = Stage.OPEN;
        while (reader.hasNext()) {
            let character = reader.next();
            if (stage === Stage.OPEN) {
                writer.append(character.getString());
                if (writer.endsWith('${')) {
                    row = character.getRow();
                    column = character.getColumn();
                    const text = writer.toString();
                    result.append(text.substring(0, text.length - 2));
                    stage = Stage.INTERPOLATION;
                    writer = new StringBuffer_1.StringBuffer();
                }
            }
            else if (stage === Stage.INTERPOLATION) {
                if (character.getString() === '}') {
                    const text = writer.toString();
                    const str = new expression_engine_1.ExpressionEngine().build(text, row, column).evaluate(data).retrieve();
                    result.append(String(str));
                    stage = Stage.OPEN;
                    writer = new StringBuffer_1.StringBuffer();
                }
                else {
                    writer.append(character.getString());
                }
            }
        }
        result.append(writer.toString());
        return Value_1.Literal.of(result.toString());
    }
}
exports.StringExpression = StringExpression;


/***/ }),

/***/ "./lib/freemarker/expression/SubstractAndAssignExpression.ts":
/*!*******************************************************************!*\
  !*** ./lib/freemarker/expression/SubstractAndAssignExpression.ts ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SubtractAndAssignExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class SubtractAndAssignExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '-=';
    }
    evaluate(data) {
        const current = this.lhs.evaluate(data);
        current.assign(current.retrieve() - this.rhs.evaluate(data).retrieve());
        return Value_1.Literal.of(undefined);
    }
}
exports.SubtractAndAssignExpression = SubtractAndAssignExpression;


/***/ }),

/***/ "./lib/freemarker/expression/SubstractionExpression.ts":
/*!*************************************************************!*\
  !*** ./lib/freemarker/expression/SubstractionExpression.ts ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SubtractionExpression = void 0;
const BinaryExpression_1 = __webpack_require__(/*! ./BinaryExpression */ "./lib/freemarker/expression/BinaryExpression.ts");
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class SubtractionExpression extends BinaryExpression_1.BinaryExpression {
    getOperator() {
        return '-';
    }
    evaluate(data) {
        return Value_1.Literal.of(this.lhs.evaluate(data).retrieve() - this.rhs.evaluate(data).retrieve());
    }
}
exports.SubtractionExpression = SubtractionExpression;


/***/ }),

/***/ "./lib/freemarker/expression/TrueExpression.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/expression/TrueExpression.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TrueExpression = void 0;
const Value_1 = __webpack_require__(/*! ./Value */ "./lib/freemarker/expression/Value.ts");
class TrueExpression {
    constructor(row, column) {
        this.row = row;
        this.column = column;
    }
    evaluate(data) {
        return Value_1.Literal.of(true);
    }
}
exports.TrueExpression = TrueExpression;


/***/ }),

/***/ "./lib/freemarker/expression/Value.ts":
/*!********************************************!*\
  !*** ./lib/freemarker/expression/Value.ts ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Reference = exports.Literal = void 0;
class Literal {
    constructor(value) {
        this.value = value;
    }
    assign(val) {
        throw new Error("Invalid assignment target");
    }
    retrieve() {
        return this.value;
    }
    static of(value) {
        return new Literal(value);
    }
}
exports.Literal = Literal;
class Reference {
    constructor(name, data) {
        this.name = name;
        this.data = data;
    }
    assign(val) {
        this.data[this.name] = val;
    }
    retrieve() {
        return this.data[this.name];
    }
    getName() {
        return this.name;
    }
    static of(name, data) {
        return new Reference(name, data);
    }
}
exports.Reference = Reference;


/***/ }),

/***/ "./lib/freemarker/expression/tokenize.ts":
/*!***********************************************!*\
  !*** ./lib/freemarker/expression/tokenize.ts ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.tokenize = exports.Token = exports.TokenType = void 0;
const StringBuffer_1 = __webpack_require__(/*! ../../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const isWhitespace_1 = __webpack_require__(/*! ../../utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
const isAlphabetic_1 = __webpack_require__(/*! ../../utilities/isAlphabetic */ "./lib/utilities/isAlphabetic.ts");
const isAlphanumeric_1 = __webpack_require__(/*! ../../utilities/isAlphanumeric */ "./lib/utilities/isAlphanumeric.ts");
const isNumeric_1 = __webpack_require__(/*! ../../utilities/isNumeric */ "./lib/utilities/isNumeric.ts");
const TemplateError_1 = __webpack_require__(/*! ../TemplateError */ "./lib/freemarker/TemplateError.ts");
exports.TokenType = {
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    LESS_THAN: 'LESS_THAN',
    LESS_THAN_OR_EQUAL: 'LESS_THAN_OR_EQUAL',
    GREATER_THAN: 'GREATER_THAN',
    GREATER_THAN_OR_EQUAL: 'GREATER_THAN_OR_EQUAL',
    OR: 'OR',
    AND: 'AND',
    BANG: 'BANG',
    REFERENCE: 'REFERENCE',
    BUILTIN: 'BUILTIN',
    GLOBAL_VARIABLE: 'GLOBAL_VARIABLE',
    TRUE: 'TRUE',
    FALSE: 'FALSE',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    OPEN_PARENTHESIS: 'OPEN_PARENTHESIS',
    CLOSE_PARENTHESIS: 'CLOSE_PARENTHESIS',
    OPEN_SEQUENCE: 'OPEN_SEQUENCE',
    CLOSE_SEQUENCE: 'CLOSE_SEQUENCE',
    OPEN_SLICE: 'OPEN_SLICE',
    OPEN_HASH: 'OPEN_HASH',
    CLOSE_HASH: 'CLOSE_HASH',
    COMMA: 'COMMA',
    COLON: 'COLON',
    ASSIGN: 'ASSIGN',
    ADD_AND_ASSIGN: 'ADD_AND_ASSIGN',
    SUBTRACT_AND_ASSIGN: 'SUBTRACT_AND_ASSIGN',
    MULTIPLY_AND_ASSIGN: 'MULTIPLY_AND_ASSIGN',
    DIVIDE_AND_ASSIGN: 'DIVIDE_AND_ASSIGN',
    MODULUS_AND_ASSIGN: 'MODULUS_AND_ASSIGN',
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    MULTIPLY: 'MULTIPLY',
    DIVIDE: 'DIVIDE',
    MODULUS: 'MODULUS',
    RANGE_INCLUSIVE: 'RANGE_INCLUSIVE',
    RANGE_EXCLUSIVE: 'RANGE_EXCLUSIVE',
    RANGE_LENGTH_INC: 'RANGE_LENGTH_INC',
    RANGE_LENGTH_DEC: 'RANGE_LENGTH_DEC',
    DEREFERENCE: 'DEREFERENCE',
    CALL_BUILTIN: 'CALL_BUILTIN',
    CALL_METHOD: 'CALL_METHOD',
    IS_DEFINED: 'IS_DEFINED',
    LAMBDA: 'LAMBDA',
    PLUS_PLUS: 'PLUS_PLUS',
    MINUS_MINUS: 'MINUS_MINUS',
};
class Token {
    constructor(type, token, row, column) {
        this.type = type;
        this.token = token;
        this.row = row;
        this.column = column;
    }
    getType() {
        return this.type;
    }
    getToken() {
        return this.token;
    }
    getRow() {
        return this.row;
    }
    getColumn() {
        return this.column;
    }
}
exports.Token = Token;
function tokenize(expression, row = 0, column = 0) {
    const reader = new StringBuffer_1.StringBuffer(expression, row, column);
    let stage = 0 /* Stage.OPEN */;
    let writer = new StringBuffer_1.StringBuffer();
    const results = [];
    function appendToken(row, column) {
        function take(partial, type) {
            results.push(new Token(type, partial, row, column - partial.length));
            return token.substring(partial.length);
        }
        let token = writer.toString();
        if (stage === 5 /* Stage.NUMBER */) {
            if (isNaN(Number(token))) {
                throw new TemplateError_1.TemplateError(row, column, `Invalid number`);
            }
            results.push(new Token(exports.TokenType.NUMBER, token, row, column - token.length));
            return;
        }
        while (token.length) {
            if (token.startsWith('..*-')) {
                token = take('..*-', exports.TokenType.RANGE_LENGTH_DEC);
            }
            else if (token.startsWith('..*+')) {
                token = take('..*+', exports.TokenType.RANGE_LENGTH_INC);
            }
            else if (token.startsWith('..*')) {
                token = take('..*', exports.TokenType.RANGE_LENGTH_INC);
            }
            else if (token.startsWith('..<')) {
                token = take('..<', exports.TokenType.RANGE_EXCLUSIVE);
            }
            else if (token.startsWith('..!')) {
                token = take('..<', exports.TokenType.RANGE_EXCLUSIVE);
            }
            else if (token.startsWith('==')) {
                token = take('==', exports.TokenType.EQUAL);
            }
            else if (token.startsWith('+=')) {
                token = take('+=', exports.TokenType.ADD_AND_ASSIGN);
            }
            else if (token.startsWith('++')) {
                token = take('++', exports.TokenType.PLUS_PLUS);
            }
            else if (token.startsWith('-=')) {
                token = take('-=', exports.TokenType.SUBTRACT_AND_ASSIGN);
            }
            else if (token.startsWith('--')) {
                token = take('--', exports.TokenType.MINUS_MINUS);
            }
            else if (token.startsWith('/=')) {
                token = take('/=', exports.TokenType.DIVIDE_AND_ASSIGN);
            }
            else if (token.startsWith('%=')) {
                token = take('%=', exports.TokenType.MODULUS_AND_ASSIGN);
            }
            else if (token.startsWith('*=')) {
                token = take('*=', exports.TokenType.MULTIPLY_AND_ASSIGN);
            }
            else if (token.startsWith('->')) {
                token = take('->', exports.TokenType.LAMBDA);
            }
            else if (token.startsWith('!=')) {
                token = take('!=', exports.TokenType.NOT_EQUAL);
            }
            else if (token.startsWith('<=')) {
                token = take('<=', exports.TokenType.LESS_THAN_OR_EQUAL);
            }
            else if (token.startsWith('&gt;')) {
                token = take('>', exports.TokenType.GREATER_THAN);
            }
            else if (token.startsWith('&lt;')) {
                token = take('<', exports.TokenType.LESS_THAN);
            }
            else if (token.startsWith('lt')) {
                token = take('<', exports.TokenType.LESS_THAN);
            }
            else if (token.startsWith('lte')) {
                token = take('<=', exports.TokenType.LESS_THAN_OR_EQUAL);
            }
            else if (token.startsWith('gt')) {
                token = take('>', exports.TokenType.GREATER_THAN);
            }
            else if (token.startsWith('gte')) {
                token = take('>=', exports.TokenType.GREATER_THAN_OR_EQUAL);
            }
            else if (token.startsWith('>=')) {
                token = take('>=', exports.TokenType.GREATER_THAN_OR_EQUAL);
            }
            else if (token.startsWith('&gt;')) {
                token = take('>=', exports.TokenType.GREATER_THAN_OR_EQUAL);
            }
            else if (token.startsWith('..')) {
                token = take('..', exports.TokenType.RANGE_INCLUSIVE);
            }
            else if (token.startsWith('??')) {
                token = take('??', exports.TokenType.IS_DEFINED);
            }
            else if (token.startsWith('||')) {
                token = take('||', exports.TokenType.OR);
            }
            else if (token.startsWith('&&')) {
                token = take('&&', exports.TokenType.AND);
            }
            else if (token.startsWith('&amp;&amp;')) {
                token = take('&&', exports.TokenType.AND);
            }
            else if (token.startsWith('true')) {
                token = take('true', exports.TokenType.TRUE);
            }
            else if (token.startsWith('false')) {
                token = take('false', exports.TokenType.FALSE);
            }
            else if (token.startsWith('=')) {
                token = take('=', exports.TokenType.ASSIGN);
            }
            else if (token.startsWith('!')) {
                token = take('!', exports.TokenType.BANG);
            }
            else if (token.startsWith('+')) {
                token = take('+', exports.TokenType.PLUS);
            }
            else if (token.startsWith('-')) {
                token = take('-', exports.TokenType.MINUS);
            }
            else if (token.startsWith('/')) {
                token = take('/', exports.TokenType.DIVIDE);
            }
            else if (token.startsWith('*')) {
                token = take('*', exports.TokenType.MULTIPLY);
            }
            else if (token.startsWith('%')) {
                token = take('%', exports.TokenType.MODULUS);
            }
            else if (token.startsWith('>')) {
                token = take('>', exports.TokenType.GREATER_THAN);
            }
            else if (token.startsWith('<')) {
                token = take('<', exports.TokenType.LESS_THAN);
            }
            else if (token.startsWith('?')) {
                token = take('?', exports.TokenType.CALL_BUILTIN);
            }
            else {
                if (results.length && results[results.length - 1].getType() === exports.TokenType.CALL_BUILTIN) {
                    results.push(new Token(exports.TokenType.BUILTIN, token, row, column - token.length));
                }
                else {
                    results.push(new Token(exports.TokenType.REFERENCE, token, row, column - token.length));
                }
                break;
            }
        }
    }
    function resetToken() {
        stage = 0 /* Stage.OPEN */;
        writer = new StringBuffer_1.StringBuffer();
    }
    let stringDelimiter = null;
    let escape = false;
    let fullStop = false;
    let lastFullStop = false;
    while (reader.hasNext()) {
        let character = reader.next();
        if (stage === 3 /* Stage.STRING */) {
            if (escape) {
                if (character.getString() == '"') {
                    writer.append('"');
                }
                else if (character.getString() == '\'') {
                    writer.append('\'');
                }
                else if (character.getString() === '{') {
                    writer.append('{');
                }
                else if (character.getString() === '=') {
                    writer.append('=');
                }
                else if (character.getString() === '\\') {
                    writer.append('\\');
                }
                else if (character.getString() === 'n') {
                    writer.append("\n");
                }
                else if (character.getString() === 'r') {
                    writer.append("\r");
                }
                else if (character.getString() === 't') {
                    writer.append("\t");
                }
                else if (character.getString() === 'b') {
                    writer.append("\b");
                }
                else if (character.getString() === 'f') {
                    writer.append("\f");
                }
                else if (character.getString() === 'l') {
                    writer.append("<");
                }
                else if (character.getString() === 'g') {
                    writer.append(">");
                }
                else if (character.getString() === 'a') {
                    writer.append("&");
                }
                else if (character.getString() === 'x') {
                    //do not escape special strings
                    writer.append("\\x");
                }
                else {
                    throw new TemplateError_1.TemplateError(character.getRow(), character.getColumn(), `Unsupported escape sequence '\\${character.getString()}'`);
                }
                escape = false;
            }
            else if (character.getString() === '\\') {
                escape = true;
            }
            else if (character.getString() === stringDelimiter) {
                const string = writer.toString();
                results.push(new Token(exports.TokenType.STRING, string, character.getRow(), character.getColumn() - string.length - 1));
                resetToken();
            }
            else {
                writer.append(character.getString());
            }
        }
        else if (stage === 4 /* Stage.RAW_STRING */) {
            if (character.getString() === stringDelimiter) {
                const string = writer.toString();
                results.push(new Token(exports.TokenType.STRING, string, character.getRow(), character.getColumn() - string.length - 2));
                resetToken();
            }
            else {
                writer.append(character.getString());
            }
        }
        else if ((0, isWhitespace_1.isWhitespace)(character.getString())) {
            appendToken(character.getRow(), character.getColumn());
            resetToken();
        }
        else if (character.getString() === '(') {
            appendToken(character.getRow(), character.getColumn());
            if (stage === 2 /* Stage.REFERENCE */) {
                results.push(new Token(exports.TokenType.CALL_METHOD, "(", character.getRow(), character.getColumn()));
            }
            else {
                results.push(new Token(exports.TokenType.OPEN_PARENTHESIS, "(", character.getRow(), character.getColumn()));
            }
            resetToken();
        }
        else if (character.getString() === '[') {
            appendToken(character.getRow(), character.getColumn());
            if (stage === 2 /* Stage.REFERENCE */) {
                results.push(new Token(exports.TokenType.OPEN_SLICE, "[", character.getRow(), character.getColumn()));
            }
            else {
                results.push(new Token(exports.TokenType.OPEN_SEQUENCE, "[", character.getRow(), character.getColumn()));
            }
            resetToken();
        }
        else if (character.getString() === '{') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.OPEN_HASH, "{", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if (character.getString() === ',') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.COMMA, ",", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if (character.getString() === ':') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.COLON, ":", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if (character.getString() === ')') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.CLOSE_PARENTHESIS, ")", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if (character.getString() === ']') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.CLOSE_SEQUENCE, "]", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if (character.getString() === '}') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.CLOSE_HASH, "}", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if (stage === 2 /* Stage.REFERENCE */) {
            if (character.getString() === '.') {
                appendToken(character.getRow(), character.getColumn());
                results.push(new Token(exports.TokenType.DEREFERENCE, ".", character.getRow(), character.getColumn()));
                resetToken();
            }
            else if (character.getString() === '"' && writer.toString() === 'r') {
                stage = 4 /* Stage.RAW_STRING */;
                stringDelimiter = '"';
                writer = new StringBuffer_1.StringBuffer();
            }
            else if (character.getString() === '\'' && writer.toString() === 'r') {
                stage = 4 /* Stage.RAW_STRING */;
                stringDelimiter = '\'';
                writer = new StringBuffer_1.StringBuffer();
            }
            else if ((0, isAlphanumeric_1.isAlphanumeric)(character.getString())) {
                writer.append(character.getString());
            }
            else if (character.getString() === '_') {
                writer.append(character.getString());
            }
            else {
                appendToken(character.getRow(), character.getColumn());
                //encountered weird character - operator.
                stage = 1 /* Stage.OPERATOR */;
                writer = new StringBuffer_1.StringBuffer();
                writer.append(character.getString());
            }
        }
        else if (character.getString() === '"') {
            appendToken(character.getRow(), character.getColumn());
            stringDelimiter = '"';
            stage = 3 /* Stage.STRING */;
            writer = new StringBuffer_1.StringBuffer();
        }
        else if (character.getString() === '\'') {
            appendToken(character.getRow(), character.getColumn());
            stringDelimiter = '\'';
            stage = 3 /* Stage.STRING */;
            writer = new StringBuffer_1.StringBuffer();
        }
        else if (stage === 1 /* Stage.OPERATOR */) {
            if ((0, isAlphabetic_1.isAlphabetic)(character.getString())) {
                appendToken(character.getRow(), character.getColumn());
                stage = 2 /* Stage.REFERENCE */;
                writer = new StringBuffer_1.StringBuffer();
                writer.append(character.getString());
            }
            else if ((0, isNumeric_1.isNumeric)(character.getString())) {
                appendToken(character.getRow(), character.getColumn());
                stage = 5 /* Stage.NUMBER */;
                writer = new StringBuffer_1.StringBuffer();
                writer.append(character.getString());
            }
            else {
                writer.append(character.getString());
            }
        }
        else if (stage === 5 /* Stage.NUMBER */) {
            if (lastFullStop) {
                if (character.getString() === '.') {
                    appendToken(character.getRow(), character.getColumn() - 1);
                    stage = 1 /* Stage.OPERATOR */;
                    fullStop = false;
                    lastFullStop = false;
                    writer = new StringBuffer_1.StringBuffer();
                    writer.append('.');
                    writer.append(character.getString());
                }
                else {
                    lastFullStop = false;
                    writer.append('.');
                    writer.append(character.getString());
                }
            }
            else if (character.getString() === '.') {
                if (lastFullStop) {
                    //double fullStop - we have a range operator.
                }
                if (fullStop) {
                    throw new TemplateError_1.TemplateError(character.getRow(), character.getColumn(), `Invalid decimal point, decimal point already processed`);
                }
                fullStop = true;
                lastFullStop = true;
            }
            else if ((0, isNumeric_1.isNumeric)(character.getString())) {
                lastFullStop = false;
                writer.append(character.getString());
            }
            else if ((0, isAlphabetic_1.isAlphabetic)(character.getString())) {
                appendToken(character.getRow(), character.getColumn());
                stage = 2 /* Stage.REFERENCE */;
                writer = new StringBuffer_1.StringBuffer();
                writer.append(character.getString());
            }
            else {
                appendToken(character.getRow(), character.getColumn());
                stage = 1 /* Stage.OPERATOR */;
                writer = new StringBuffer_1.StringBuffer();
                writer.append(character.getString());
            }
        }
        else if (character.getString() === '.') {
            appendToken(character.getRow(), character.getColumn());
            results.push(new Token(exports.TokenType.DEREFERENCE, ".", character.getRow(), character.getColumn()));
            resetToken();
        }
        else if ((0, isAlphabetic_1.isAlphabetic)(character.getString())) {
            // reference is a special mode where alphanumerics for a token, and anything else terminates the token.
            stage = 2 /* Stage.REFERENCE */;
            writer.append(character.getString());
        }
        else if ((0, isNumeric_1.isNumeric)(character.getString())) {
            // number is a special mode where fullstop means something specific, a decimal point. Alphabetic characters are invalid.
            stage = 5 /* Stage.NUMBER */;
            fullStop = false;
            lastFullStop = false;
            writer.append(character.getString());
        }
        else if (character.getString() === '.') {
            appendToken(character.getRow(), character.getColumn());
            writer = new StringBuffer_1.StringBuffer();
            writer.append(".");
            stage = 2 /* Stage.REFERENCE */;
        }
        else {
            stage = 1 /* Stage.OPERATOR */;
            writer.append(character.getString());
        }
    }
    if (stage === 3 /* Stage.STRING */ || stage === 4 /* Stage.RAW_STRING */) {
        throw new TemplateError_1.TemplateError(row, column, `Unclosed string`);
    }
    appendToken(reader.getRow(), reader.getColumn());
    return results;
}
exports.tokenize = tokenize;


/***/ }),

/***/ "./lib/freemarker/template/LexicalToken.ts":
/*!*************************************************!*\
  !*** ./lib/freemarker/template/LexicalToken.ts ***!
  \*************************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LexicalToken = void 0;
class LexicalToken {
    constructor(type, column, row, text, params, paramsRow, paramsColumn) {
        this.type = type;
        this.column = column;
        this.row = row;
        this.text = text;
        this.params = params;
        this.paramsRow = paramsRow;
        this.paramsColumn = paramsColumn;
    }
    getType() {
        return this.type;
    }
    getRow() {
        return this.row;
    }
    getColumn() {
        return this.column;
    }
    getText() {
        return this.text;
    }
    getParams() {
        return this.params;
    }
    getParamsRow() {
        return this.paramsRow;
    }
    getParamsColumn() {
        return this.paramsColumn;
    }
}
exports.LexicalToken = LexicalToken;


/***/ }),

/***/ "./lib/freemarker/template/LexicalTokenType.ts":
/*!*****************************************************!*\
  !*** ./lib/freemarker/template/LexicalTokenType.ts ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.LexicalTokenType = void 0;
exports.LexicalTokenType = {
    OPEN_DIRECTIVE: 'OPEN_DIRECTIVE',
    CLOSE_DIRECTIVE: 'CLOSE_DIRECTIVE',
    TEXT: 'TEXT',
    INTERPOLATION: 'INTERPOLATION',
};


/***/ }),

/***/ "./lib/freemarker/template/lexer.ts":
/*!******************************************!*\
  !*** ./lib/freemarker/template/lexer.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.parse = void 0;
const LexicalToken_1 = __webpack_require__(/*! ./LexicalToken */ "./lib/freemarker/template/LexicalToken.ts");
const StringBuffer_1 = __webpack_require__(/*! ../../utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const LexicalTokenType_1 = __webpack_require__(/*! ./LexicalTokenType */ "./lib/freemarker/template/LexicalTokenType.ts");
const isWhitespace_1 = __webpack_require__(/*! ../../utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
var InterpolationStage;
(function (InterpolationStage) {
    InterpolationStage[InterpolationStage["OPEN"] = 0] = "OPEN";
    InterpolationStage[InterpolationStage["STRING"] = 1] = "STRING";
    InterpolationStage[InterpolationStage["RAW_STRING"] = 2] = "RAW_STRING";
})(InterpolationStage || (InterpolationStage = {}));
function parse(template) {
    const results = [];
    let writer = new StringBuffer_1.StringBuffer();
    let startColumn = 0, startRow = 0;
    const reader = new StringBuffer_1.StringBuffer(template);
    while (reader.hasNext()) {
        let character = reader.next();
        writer.append(character.getString());
        if (writer.endsWith('</#')) {
            const text = writer.toString();
            if (text.length - 3) {
                results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.TEXT, startColumn, startRow, text.substring(0, text.length - 3), undefined));
                startColumn = character.getColumn() - 2;
                startRow = character.getRow();
            }
            writer = new StringBuffer_1.StringBuffer();
            while (reader.hasNext()) {
                character = reader.next();
                if ((0, isWhitespace_1.isWhitespace)(character.getString()) || character.getString() === '>') {
                    break;
                }
                writer.append(character.getString());
            }
            const directive = writer.toString();
            writer = new StringBuffer_1.StringBuffer();
            if ((0, isWhitespace_1.isWhitespace)(character.getString())) {
                while (reader.hasNext()) {
                    character = reader.next();
                    if (character.getString() === '>') {
                        break;
                    }
                    writer.append(character.getString());
                }
            }
            results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.CLOSE_DIRECTIVE, startColumn, startRow, directive, writer.toString()));
            writer = new StringBuffer_1.StringBuffer();
            startColumn = character.getColumn() + 1;
            startRow = character.getRow();
        }
        else if (writer.endsWith('<#')) {
            const text = writer.toString();
            if (text.length - 2) {
                results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.TEXT, startColumn, startRow, text.substring(0, text.length - 2)));
                startColumn = character.getColumn() - 1;
                startRow = character.getRow();
            }
            writer = new StringBuffer_1.StringBuffer();
            while (reader.hasNext()) {
                character = reader.next();
                if ((0, isWhitespace_1.isWhitespace)(character.getString()) || character.getString() === '>') {
                    break;
                }
                writer.append(character.getString());
            }
            const directive = writer.toString();
            writer = new StringBuffer_1.StringBuffer();
            let paramsRow, paramsColumn;
            if ((0, isWhitespace_1.isWhitespace)(character.getString())) {
                let leading = true;
                paramsRow = character.getRow();
                paramsColumn = character.getColumn();
                while (reader.hasNext()) {
                    character = reader.next();
                    if (leading) {
                        if ((0, isWhitespace_1.isWhitespace)(character.getString())) {
                            continue;
                        }
                        paramsRow = character.getRow();
                        paramsColumn = character.getColumn();
                    }
                    leading = false;
                    if (character.getString() === '>') {
                        break;
                    }
                    else if (character.getString() === '"') {
                        writer.append(character.getString());
                        while (reader.hasNext()) {
                            character = reader.next();
                            if (character.getString() === '\\') {
                                writer.append(character.getString());
                                if (reader.hasNext()) {
                                    character = reader.next();
                                }
                            }
                            else if (character.getString() === '"') {
                                break;
                            }
                            writer.append(character.getString());
                        }
                    }
                    writer.append(character.getString());
                }
            }
            results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.OPEN_DIRECTIVE, startColumn, startRow, directive, writer.toString(), paramsRow, paramsColumn));
            writer = new StringBuffer_1.StringBuffer();
            startColumn = character.getColumn() + 1;
            startRow = character.getRow();
        }
        else if (writer.endsWith('${')) {
            const text = writer.toString();
            if (text.length - 2) {
                results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.TEXT, startColumn, startRow, text.substring(0, text.length - 2), undefined));
                startColumn = character.getColumn() - 1;
                startRow = character.getRow();
            }
            writer = new StringBuffer_1.StringBuffer();
            startColumn = character.getColumn() - 1;
            startRow = character.getRow();
            let paramsRow, paramsColumn, leading = true, isRaw = false;
            let stage = InterpolationStage.OPEN;
            while (reader.hasNext()) {
                character = reader.next();
                if (leading) {
                    if ((0, isWhitespace_1.isWhitespace)(character.getString())) {
                        continue;
                    }
                    leading = false;
                    paramsRow = character.getRow();
                    paramsColumn = character.getColumn();
                }
                if (stage === InterpolationStage.OPEN) {
                    if (character.getString() === '"') {
                        if (isRaw) {
                            stage = InterpolationStage.RAW_STRING;
                        }
                        else {
                            stage = InterpolationStage.STRING;
                        }
                        isRaw = false;
                    }
                    else if (character.getString() === "r") {
                        isRaw = true;
                    }
                    else if (character.getString() === "}") {
                        break;
                    }
                    else {
                        isRaw = false;
                    }
                    writer.append(character.getString());
                }
                else if (stage === InterpolationStage.RAW_STRING) {
                    if (character.getString() === '"') {
                        stage = InterpolationStage.OPEN;
                    }
                    writer.append(character.getString());
                }
                else if (stage === InterpolationStage.STRING) {
                    if (character.getString() === '\\') {
                        if (reader.hasNext()) {
                            character = reader.next();
                            writer.append(character.getString());
                        }
                    }
                    else if (character.getString() === '"') {
                        stage = InterpolationStage.OPEN;
                    }
                    writer.append(character.getString());
                }
            }
            results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.INTERPOLATION, startColumn, startRow, '', writer.toString(), paramsRow, paramsColumn));
            writer = new StringBuffer_1.StringBuffer();
            startColumn = character.getColumn() + 1;
            startRow = character.getRow();
        }
    }
    const text = writer.toString();
    if (text.length) {
        results.push(new LexicalToken_1.LexicalToken(LexicalTokenType_1.LexicalTokenType.TEXT, startColumn, startRow, text, undefined));
    }
    return results;
}
exports.parse = parse;


/***/ }),

/***/ "./lib/index.ts":
/*!**********************!*\
  !*** ./lib/index.ts ***!
  \**********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";
//#! /usr/bin/env node

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const parser_1 = __webpack_require__(/*! ./parser */ "./lib/parser.ts");
const path = __importStar(__webpack_require__(/*! node:path */ "node:path"));
const fs = __importStar(__webpack_require__(/*! fs */ "fs"));
const properties_1 = __importDefault(__webpack_require__(/*! ./properties */ "./lib/properties.ts"));
const freemarker_1 = __webpack_require__(/*! ./freemarker */ "./lib/freemarker.ts");
const Store_1 = __importDefault(__webpack_require__(/*! ./store/Store */ "./lib/store/Store.ts"));
const html_format_1 = __importDefault(__webpack_require__(/*! html-format */ "./node_modules/html-format/index.js"));
const RenderingEngine_1 = __importDefault(__webpack_require__(/*! ./RenderingEngine */ "./lib/RenderingEngine.ts"));
const FreemarkerError_1 = __webpack_require__(/*! ./freemarker/FreemarkerError */ "./lib/freemarker/FreemarkerError.ts");
const commander = __webpack_require__(/*! commander */ "./node_modules/commander/index.js");
const options = commander
    .version('1.0.0', '-v, --version')
    .usage('[OPTIONS]...')
    .option('-d, --dir <value>', 'Specifies location of the materials.', './')
    .option('-o, --output <value>', 'Specifies location of the output.', './html')
    .option('-s, --page <value>', 'Specifies a single page to process.')
    .parse(process.argv)
    .opts();
if (!fs.existsSync(path.join(process.env.INIT_CWD, options.output))) {
    fs.mkdirSync(path.join(process.env.INIT_CWD, options.output));
}
const classMappingsData = fs.readFileSync(path.join(process.env.INIT_CWD, options.dir, 'class-mappings.properties'), 'utf8');
const classMappings = new properties_1.default(classMappingsData);
const plantainSubstitutions = JSON.parse(fs.readFileSync(path.join(process.env.INIT_CWD, options.dir, 'plantain-substitutions.json'), 'utf8'));
function processDirectory(dir, suffix, baseTemplate) {
    fs.readdir(path.join(process.env.INIT_CWD, options.dir, dir), function (err, files) {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        files.forEach(function (file) {
            if (options.page && file !== options.page) {
                return;
            }
            Store_1.default.clear();
            console.log('processing ' + file);
            const substitutions = plantainSubstitutions[file] || {};
            const dom = (0, parser_1.parse)(fs.readFileSync(path.join(process.env.INIT_CWD, options.dir, dir, file), 'utf8'));
            const renderingEngine = new RenderingEngine_1.default(file, classMappings, substitutions, options.dir);
            const body = renderingEngine.renderElement(dom.root);
            const mainTemplate = fs.readFileSync(path.join(process.env.INIT_CWD, options.dir, baseTemplate), 'utf8');
            try {
                const html = new freemarker_1.TemplateEngine().render(mainTemplate, {
                    body: body,
                    title: dom.root.attributes.title,
                    authenticated: false
                });
                fs.writeFileSync(path.join(process.env.INIT_CWD, options.output, file.replaceAll(suffix, ".html")), (0, html_format_1.default)(html));
            }
            catch (err) {
                throw new FreemarkerError_1.FreemarkerError(`Error processing ftl template 'main.ftl'`, err);
            }
        });
    });
}
processDirectory('pages', ".page.xml", "main.ftl");
processDirectory('emails', ".email.xml", "email.ftl");


/***/ }),

/***/ "./lib/parser.ts":
/*!***********************!*\
  !*** ./lib/parser.ts ***!
  \***********************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deepCopyNode = exports.descapeString = exports.escapeString = exports.serializeNodes = exports.serializeNode = exports.serializeDocument = exports.throwError = exports.parse = exports.Text = exports.Element = exports.isEmpty = exports.isText = exports.isElement = exports.Document = void 0;
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
const isWhitespace_1 = __webpack_require__(/*! ./utilities/isWhitespace */ "./lib/utilities/isWhitespace.ts");
const isAlphabetic_1 = __webpack_require__(/*! ./utilities/isAlphabetic */ "./lib/utilities/isAlphabetic.ts");
const isAlphanumeric_1 = __webpack_require__(/*! ./utilities/isAlphanumeric */ "./lib/utilities/isAlphanumeric.ts");
class Document {
    constructor(processing, root) {
        this.processing = processing;
        this.root = root;
    }
}
exports.Document = Document;
function isElement(subject) {
    return subject.name !== undefined;
}
exports.isElement = isElement;
function isText(subject) {
    return subject.text !== undefined;
}
exports.isText = isText;
function isEmpty(nodes) {
    if (nodes.length === 0) {
        return true;
    }
    if (nodes.length === 1) {
        const first = nodes[0];
        if (first instanceof Text) {
            if (first.text.trim().length === 0) {
                return true;
            }
        }
    }
    return false;
}
exports.isEmpty = isEmpty;
class Element {
    constructor(name, attributes, children = []) {
        this.name = '';
        this.attributes = {};
        this.children = [];
        if (name) {
            this.name = name;
        }
        if (attributes) {
            this.attributes = attributes;
        }
        if (children) {
            this.children = children;
        }
    }
}
exports.Element = Element;
class Text {
    constructor(text) {
        this.text = '';
        this.text = text;
    }
}
exports.Text = Text;
const Stage = {
    OPEN: 'OPEN',
    TAG: 'TAG',
    CLOSING_TAG: 'CLOSING_TAG',
    CLOSING_TAG_OPEN: 'CLOSING_TAG_OPEN',
    PROCESSING_TAG: 'PROCESSING_TAG',
    PROCESSING_TAG_NAME: 'PROCESSING_TAG_NAME',
    PROCESSING_TAG_OPEN: 'PROCESSING_TAG_OPEN',
    PROCESSING_TAG_ATTRIBUTE_NAME: 'PROCESSING_TAG_ATTRIBUTE_NAME',
    PROCESSING_TAG_ATTRIBUTE_EQUALS: 'PROCESSING_TAG_ATTRIBUTE_EQUALS',
    PROCESSING_TAG_ATTRIBUTE_VALUE: 'PROCESSING_TAG_ATTRIBUTE_VALUE',
    PROCESSING_TAG_CLOSING: 'PROCESSING_TAG_CLOSING',
    ELEMENT_NAME: 'ELEMENT_NAME',
    ELEMENT_OPEN: 'ELEMENT_OPEN',
    ELEMENT_ATTRIBUTE_NAME: 'ELEMENT_ATTRIBUTE_NAME',
    ELEMENT_ATTRIBUTE_EQUALS: 'ELEMENT_ATTRIBUTE_EQUALS',
    ELEMENT_ATTRIBUTE_VALUE: 'ELEMENT_ATTRIBUTE_VALUE',
    ELEMENT_CONTENT: 'ELEMENT_CONTENT',
    ELEMENT_AUTO_CLOSING: 'ELEMENT_AUTO_CLOSING',
    COMMENT: 'COMMENT',
};
function parse(xml) {
    const reader = new StringBuffer_1.StringBuffer(xml);
    let attributeName = undefined;
    let processing = {};
    let processingTagName = undefined;
    let processingAttributes = {};
    let stack = [];
    let current = undefined;
    let stage = Stage.OPEN;
    let writer = new StringBuffer_1.StringBuffer();
    let escape = false;
    while (reader.hasNext()) {
        let character = reader.next();
        let c = character.getString();
        if (c.charCodeAt(0) === 10) {
            continue;
        }
        if (stage === Stage.OPEN) {
            if (c === '<') {
                stage = Stage.TAG;
            }
            else {
                writer.append(c);
            }
        }
        else if (stage === Stage.COMMENT) {
            if (c === '>') {
                stage = Stage.ELEMENT_CONTENT;
            }
            else {
                //do nothing
            }
        }
        else if (stage === Stage.TAG) {
            if (c === '/') {
                stage = Stage.CLOSING_TAG;
            }
            else if (c === '?') {
                stage = Stage.PROCESSING_TAG;
            }
            else if (c === '!') {
                stage = Stage.COMMENT;
            }
            else if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else if ((0, isAlphabetic_1.isAlphabetic)(c)) {
                const child = new Element();
                if (current) {
                    current.children.push(child);
                }
                current = child;
                stack.push(current);
                stage = Stage.ELEMENT_NAME;
                writer.append(c);
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.PROCESSING_TAG) {
            if ((0, isAlphabetic_1.isAlphabetic)(c)) {
                stage = Stage.PROCESSING_TAG_NAME;
                writer.append(c);
            }
            else if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.PROCESSING_TAG_NAME) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
                stage = Stage.PROCESSING_TAG_OPEN;
                processingTagName = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                processingAttributes = {};
            }
            else if ((0, isAlphanumeric_1.isAlphanumeric)(c)) {
                writer.append(c);
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.PROCESSING_TAG_OPEN) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else if ((0, isAlphabetic_1.isAlphabetic)(c)) {
                stage = Stage.PROCESSING_TAG_ATTRIBUTE_NAME;
                writer.append(c);
            }
            else if (c === '?') {
                stage = Stage.PROCESSING_TAG_CLOSING;
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.PROCESSING_TAG_ATTRIBUTE_NAME) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
                throwError(c, character.getRow(), character.getColumn());
            }
            else if (c === '=') {
                attributeName = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.PROCESSING_TAG_ATTRIBUTE_EQUALS;
            }
            else if ((0, isAlphanumeric_1.isAlphanumeric)(c)) {
                writer.append(c);
            }
        }
        else if (stage === Stage.PROCESSING_TAG_ATTRIBUTE_EQUALS) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else if (c === '"') {
                stage = Stage.PROCESSING_TAG_ATTRIBUTE_VALUE;
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.PROCESSING_TAG_ATTRIBUTE_VALUE) {
            if (!escape && c === '\\') {
                escape = true;
            }
            else if (!escape && c === '"') {
                processingAttributes[attributeName] = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.PROCESSING_TAG_OPEN;
            }
            else {
                writer.append(c);
                escape = false;
            }
        }
        else if (stage === Stage.PROCESSING_TAG_CLOSING) {
            if (c === '>') {
                processing[processingTagName] = processingAttributes;
                stage = Stage.OPEN;
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.ELEMENT_NAME) {
            if (c === '/') {
                current.name = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.ELEMENT_AUTO_CLOSING;
            }
            else if (c === '>') {
                current.name = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.ELEMENT_CONTENT;
            }
            else if ((0, isWhitespace_1.isWhitespace)(c)) {
                current.name = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.ELEMENT_OPEN;
            }
            else {
                writer.append(c);
            }
        }
        else if (stage === Stage.ELEMENT_OPEN) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else if (c === '>') {
                stage = Stage.ELEMENT_CONTENT;
            }
            else if (c === '/') {
                stage = Stage.ELEMENT_AUTO_CLOSING;
            }
            else if ((0, isAlphabetic_1.isAlphabetic)(c)) {
                writer.append(c);
                stage = Stage.ELEMENT_ATTRIBUTE_NAME;
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.ELEMENT_ATTRIBUTE_NAME) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
                throwError(c, character.getRow(), character.getColumn());
            }
            else if (c === '=') {
                attributeName = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.ELEMENT_ATTRIBUTE_EQUALS;
            }
            else if ((0, isAlphanumeric_1.isAlphanumeric)(c)) {
                writer.append(c);
            }
        }
        else if (stage === Stage.ELEMENT_ATTRIBUTE_EQUALS) {
            if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else if (c === '"') {
                stage = Stage.ELEMENT_ATTRIBUTE_VALUE;
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.ELEMENT_ATTRIBUTE_VALUE) {
            if (!escape && c === '\\') {
                escape = true;
            }
            else if (!escape && c === '"') {
                current.attributes[attributeName] = descapeString(writer.toString());
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.ELEMENT_OPEN;
            }
            else {
                escape = false;
                writer.append(c);
            }
        }
        else if (stage === Stage.ELEMENT_CONTENT) {
            if (c === '<') {
                const text = writer.toString();
                if (text.length !== 0) {
                    if (current.children.length > 0 && isText(current.children[current.children.length - 1])) {
                        //this only happens if we have a comment.  We need to merge the current context into the previous text.
                        const text = current.children[current.children.length - 1];
                        text.text = text.text + descapeString(writer.toString());
                    }
                    else {
                        current.children.push(new Text(descapeString(writer.toString())));
                    }
                }
                writer = new StringBuffer_1.StringBuffer();
                stage = Stage.TAG;
            }
            else {
                writer.append(c);
            }
        }
        else if (stage === Stage.CLOSING_TAG) {
            if (c === '>') {
                const closeTag = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                if (closeTag !== current.name) {
                    throw new Error(`close tag (${closeTag}) doesn't match start tag ${current.name}`);
                }
                stack.pop();
                if (stack.length !== 0) {
                    current = stack[stack.length - 1];
                }
                stage = Stage.ELEMENT_CONTENT;
            }
            else if ((0, isWhitespace_1.isWhitespace)(c)) {
                stage = Stage.CLOSING_TAG_OPEN;
            }
            else {
                writer.append(c);
            }
        }
        else if (stage === Stage.CLOSING_TAG_OPEN) {
            if (c === '>') {
                const closeTag = writer.toString();
                writer = new StringBuffer_1.StringBuffer();
                if (closeTag !== current.name) {
                    throw new Error(`close tag (${closeTag}) doesn't match start tag ${current.name}`);
                }
                stack.pop();
                if (stack.length !== 0) {
                    current = stack[stack.length - 1];
                }
                stage = Stage.ELEMENT_CONTENT;
            }
            else if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
        else if (stage === Stage.ELEMENT_AUTO_CLOSING) {
            if (c === '>') {
                stack.pop();
                if (stack.length !== 0) {
                    current = stack[stack.length - 1];
                }
                stage = Stage.ELEMENT_CONTENT;
            }
            else if ((0, isWhitespace_1.isWhitespace)(c)) {
            }
            else {
                throwError(c, character.getRow(), character.getColumn());
            }
        }
    }
    if (current === undefined) {
        current = new Text(writer.toString());
    }
    return new Document(processing, current);
}
exports.parse = parse;
function throwError(c, row, column) {
    throw new Error(`Character (${c}) not allowed at position ${row}:${column}.`);
}
exports.throwError = throwError;
function serializeDocument(document) {
    const processing = Object.entries(document.processing)
        .map(([key, value]) => {
        const writer = new StringBuffer_1.StringBuffer();
        writer.append("<?");
        writer.append(key);
        writer.append(" ");
        writer.append(Object.entries(value)
            .map(([key2, value2]) => `${key2}="${escapeString(value2)}"`).join(' '));
        writer.append(" ");
        writer.append("?>");
        return writer.toString();
    }).join(' ');
    return `${processing}${serializeNode(document.root)}`;
}
exports.serializeDocument = serializeDocument;
function serializeNode(node) {
    if (node instanceof Text) {
        return escapeString(node.text);
    }
    else if (node instanceof Element) {
        const attributes = Object.entries(node.attributes).map(([key, value]) => {
            return `${key}="${escapeString(value)}"`;
        }).join(' ');
        const body = serializeNodes(node.children);
        if (body === '') {
            return `<${node.name} ${attributes}/>`;
        }
        return `<${node.name} ${attributes}>${body}</${node.name}>`;
    }
    else {
        throw new Error("Should never happen");
    }
}
exports.serializeNode = serializeNode;
function serializeNodes(nodes) {
    return nodes.map(node => serializeNode(node)).join('');
}
exports.serializeNodes = serializeNodes;
function escapeString(input) {
    return input
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/'/g, '&apos;');
}
exports.escapeString = escapeString;
function descapeString(input) {
    return input
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, '\'');
}
exports.descapeString = descapeString;
function deepCopyNode(node) {
    function copy(node) {
        if (isElement(node)) {
            const children = node.children.map(copy);
            return new Element(node.name, Object.assign({}, node.attributes), children);
        }
        else if (isText(node)) {
            return new Text(node.text);
        }
        else {
            throw new Error("Never happen");
        }
    }
    return copy(node);
}
exports.deepCopyNode = deepCopyNode;
// export = {
//     deepCopyNode,
//     escapeString,
//     serializeNodes,
//     serializeDocument,
//     parse,
//     Text,
//     Element: Element,
//     Document,
//     isAlphabetic,
//     isAlphanumeric,
//     isWhitespace,
//     isEmpty,
//     StringBuffer
// };
//
// console.log(module)


/***/ }),

/***/ "./lib/properties.ts":
/*!***************************!*\
  !*** ./lib/properties.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Properties {
    constructor(data) {
        this.data = {};
        data.split("\n").forEach(line => {
            const index = line.indexOf("=");
            if (index > -1) {
                const key = line.substring(0, index);
                this.data[key] = line.substring(index + 1);
            }
        });
    }
    get(key) {
        return this.data[key];
    }
}
exports["default"] = Properties;


/***/ }),

/***/ "./lib/store/Message.ts":
/*!******************************!*\
  !*** ./lib/store/Message.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Message {
    constructor(id, dateTime, wipId, kaseId, wizardId, workflowId, group, queue, principal, sessionId, timeStamp) {
        this.id = id;
        this.dateTime = dateTime;
        this.wipId = wipId;
        this.kaseId = kaseId;
        this.wizardId = wizardId;
        this.workflowId = workflowId;
        this.group = group;
        this.queue = queue;
        this.principal = principal;
        this.sessionId = sessionId;
        this.timeStamp = timeStamp;
    }
    getId() {
        return this.id;
    }
    getDateTime() {
        return this.dateTime;
    }
    getWipId() {
        return this.wipId;
    }
    getKaseId() {
        return this.kaseId;
    }
    getWizardId() {
        return this.wizardId;
    }
    getWorkflowId() {
        return this.workflowId;
    }
    getGroup() {
        return this.group;
    }
    getQueue() {
        return this.queue;
    }
    getPrincipal() {
        return this.principal;
    }
    getSessionId() {
        return this.sessionId;
    }
    getTimeStamp() {
        return this.timeStamp;
    }
}
exports["default"] = Message;


/***/ }),

/***/ "./lib/store/Page.ts":
/*!***************************!*\
  !*** ./lib/store/Page.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Page {
    constructor(name, version, group, title, description) {
        this.name = name;
        this.version = version;
        this.group = group;
        this.title = title;
        this.description = description;
    }
    getName() {
        return this.name;
    }
    getVersion() {
        return this.version;
    }
    getGroup() {
        return this.group;
    }
    getTitle() {
        return this.title;
    }
    getDescription() {
        return this.description;
    }
}
exports["default"] = Page;


/***/ }),

/***/ "./lib/store/Queue.ts":
/*!****************************!*\
  !*** ./lib/store/Queue.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Queue {
    constructor(name, title, description) {
        this.name = name;
        this.title = title;
        this.description = description;
    }
    getName() {
        return this.name;
    }
    getTitle() {
        return this.title;
    }
    getDescription() {
        return this.description;
    }
}
exports["default"] = Queue;


/***/ }),

/***/ "./lib/store/Store.ts":
/*!****************************!*\
  !*** ./lib/store/Store.ts ***!
  \****************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Store {
    constructor(users = [], groups = [], messages = [], wizards = [], workflows = [], pages = [], queues = []) {
        this.users = users;
        this.groups = groups;
        this.messages = messages;
        this.wizards = wizards;
        this.workflows = workflows;
        this.pages = pages;
        this.queues = queues;
        this.testContext = false;
    }
    getUsers() {
        return this.users;
    }
    getGroups() {
        return this.groups;
    }
    getMessages() {
        return this.messages;
    }
    getWizards() {
        return this.wizards;
    }
    getWorkflows() {
        return this.workflows;
    }
    getPages() {
        return this.pages;
    }
    getQueues() {
        return this.queues;
    }
    setTestContext() {
        this.testContext = true;
    }
    isTestContext() {
        return this.testContext;
    }
    clear() {
        this.users = [];
        this.groups = [];
        this.messages = [];
        this.wizards = [];
        this.workflows = [];
        this.pages = [];
        this.testContext = false;
    }
    addUser(user) {
        this.users.push(user);
    }
    addMessage(message) {
        this.messages.push(message);
    }
    addWizard(wizard) {
        this.wizards.push(wizard);
    }
    addWorkflow(workflow) {
        this.workflows.push(workflow);
    }
    addPage(page) {
        this.pages.push(page);
    }
    addQueue(queue) {
        this.queues.push(queue);
    }
}
const INSTANCE = new Store();
exports["default"] = INSTANCE;
/*
 private final HashMap<DocumentGroupId, PageView> pages = new HashMap<>();
    private final HashMap<DocumentId, Wizard> wizards = new HashMap<>();
    private final HashMap<DocumentGroupId, Workflow> workflows = new HashMap<>();
    private final HashMap<MessageId, Message> messages = new HashMap<>();
    private final HashMap<String, Kase> kases = new HashMap<>();
    private final HashMap<UUID, WizardInProgress> wips = new HashMap<>();
 */ 


/***/ }),

/***/ "./lib/store/User.ts":
/*!***************************!*\
  !*** ./lib/store/User.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class User {
    constructor(username, title, firstName, lastName, email, contactNumber, dateOfBirth, timezone, groups, userData) {
        this.username = username;
        this.title = title;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.contactNumber = contactNumber;
        this.dateOfBirth = dateOfBirth;
        this.timezone = timezone;
        this.groups = groups;
        this.userData = userData;
    }
    getUsername() {
        return this.username;
    }
    getTitle() {
        return this.title;
    }
    getFirstName() {
        return this.firstName;
    }
    getLastName() {
        return this.lastName;
    }
    getEmail() {
        return this.email;
    }
    getContactNumber() {
        return this.contactNumber;
    }
    getDateOfBirth() {
        return this.dateOfBirth;
    }
    getTimezone() {
        return this.timezone;
    }
    getGroups() {
        return this.groups;
    }
    getUserData() {
        return this.username;
    }
}
exports["default"] = User;


/***/ }),

/***/ "./lib/store/Wizard.ts":
/*!*****************************!*\
  !*** ./lib/store/Wizard.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Wizard {
    constructor(name, version, title, description, active, released) {
        this.name = name;
        this.version = version;
        this.title = title;
        this.description = description;
        this.active = active;
        this.released = released;
    }
    getName() {
        return this.name;
    }
    getVersion() {
        return this.version;
    }
    getTitle() {
        return this.title;
    }
    getDescription() {
        return this.description;
    }
    getActive() {
        return this.active;
    }
    getReleased() {
        return this.released;
    }
}
exports["default"] = Wizard;


/***/ }),

/***/ "./lib/store/Workflow.ts":
/*!*******************************!*\
  !*** ./lib/store/Workflow.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
class Workflow {
    constructor(name, version, group, title, description) {
        this.name = name;
        this.version = version;
        this.group = group;
        this.title = title;
        this.description = description;
    }
    getName() {
        return this.name;
    }
    getVersion() {
        return this.version;
    }
    getGroup() {
        return this.group;
    }
    getTitle() {
        return this.title;
    }
    getDescription() {
        return this.description;
    }
}
exports["default"] = Workflow;


/***/ }),

/***/ "./lib/text-style-support.ts":
/*!***********************************!*\
  !*** ./lib/text-style-support.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.textStyleSupport = void 0;
const StringBuffer_1 = __webpack_require__(/*! ./utilities/StringBuffer */ "./lib/utilities/StringBuffer.ts");
function textStyleSupport(data, classManager, attributes, classMappings) {
    const styles = {};
    if (attributes.textAlign) {
        styles['text-align'] = attributes.textAign.toLowerCase();
    }
    if (attributes.fontSize) {
        styles['font-size'] = attributes.fontSize;
    }
    if (attributes.textDecoration) {
        styles['text-decoration'] = attributes.textDecoration.toLowerCase();
    }
    if (attributes.fontStyle) {
        styles['font-style'] = attributes.fontStyle.toLowerCase();
    }
    if (attributes.fontWeight) {
        styles['font-weight'] = attributes.fontWeight.toLowerCase();
    }
    if (attributes.font) {
        styles['font'] = classMappings.get('font-' + attributes.font.toLowerCase().replaceAll("_", "-"));
    }
    if (attributes.fontFlavour) {
        classManager.append(attributes.fontFlavour, 'text-', '');
    }
    if (attributes.backgroundFlavour) {
        classManager.append(attributes.backgroundFlavour, 'bg-', '');
    }
    const buffer = new StringBuffer_1.StringBuffer();
    for (const [key, value] of Object.entries(styles)) {
        buffer.append(`${key}: ${value};`);
    }
    data.textualStyles = buffer.toString();
}
exports.textStyleSupport = textStyleSupport;


/***/ }),

/***/ "./lib/utilities/StringBuffer.ts":
/*!***************************************!*\
  !*** ./lib/utilities/StringBuffer.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Character = exports.StringBuffer = void 0;
class StringBuffer {
    constructor(input = undefined, row = 0, column = 0) {
        this.buffer = input ? input.split('') : [];
        this.index = 0;
        this.column = column;
        this.row = row;
    }
    append(c) {
        this.buffer.push(c);
    }
    endsWith(c) {
        if (c.length > this.buffer.length) {
            return false;
        }
        return this.buffer.slice(this.buffer.length - c.length).join("") === c;
    }
    next() {
        const result = this.buffer[this.index];
        const column = this.column;
        const row = this.row;
        this.index++;
        if (result === '\n') {
            this.row++;
            this.column = 0;
        }
        else {
            this.column++;
        }
        return new Character(result, column, row);
    }
    hasNext() {
        return this.index < this.buffer.length;
    }
    toString() {
        return this.buffer.join('');
    }
    getColumn() {
        return this.column;
    }
    getRow() {
        return this.row;
    }
}
exports.StringBuffer = StringBuffer;
class Character {
    constructor(c, column, row) {
        this.c = c;
        this.column = column;
        this.row = row;
    }
    getString() {
        return this.c;
    }
    getColumn() {
        return this.column;
    }
    getRow() {
        return this.row;
    }
}
exports.Character = Character;


/***/ }),

/***/ "./lib/utilities/generate-id.ts":
/*!**************************************!*\
  !*** ./lib/utilities/generate-id.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
const CHARACTERS = "abcdefghiklmnopqrstuvwxwzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
function generateId() {
    const result = [];
    for (let i = 0; i < 10; i++) {
        result.push(CHARACTERS[Math.floor(Math.random() * 100) % CHARACTERS.length]);
    }
    return result.join("");
}
exports["default"] = generateId;


/***/ }),

/***/ "./lib/utilities/isAlphabetic.ts":
/*!***************************************!*\
  !*** ./lib/utilities/isAlphabetic.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isAlphabetic = void 0;
function isAlphabetic(c) {
    return /^[a-zA-Z]+$/i.test(c);
}
exports.isAlphabetic = isAlphabetic;


/***/ }),

/***/ "./lib/utilities/isAlphanumeric.ts":
/*!*****************************************!*\
  !*** ./lib/utilities/isAlphanumeric.ts ***!
  \*****************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isAlphanumeric = void 0;
function isAlphanumeric(c) {
    return /^[a-zA-Z0-9]+$/i.test(c);
}
exports.isAlphanumeric = isAlphanumeric;


/***/ }),

/***/ "./lib/utilities/isDate.ts":
/*!*********************************!*\
  !*** ./lib/utilities/isDate.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isDate = void 0;
function isDate(obj) {
    if (obj === null)
        return false;
    if (typeof obj !== "object")
        return false;
    return obj.constructor === Date;
}
exports.isDate = isDate;


/***/ }),

/***/ "./lib/utilities/isHash.ts":
/*!*********************************!*\
  !*** ./lib/utilities/isHash.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isHash = void 0;
function isHash(obj) {
    if (obj === null)
        return false;
    if (Array.isArray(obj))
        return false;
    return typeof obj === "object";
}
exports.isHash = isHash;


/***/ }),

/***/ "./lib/utilities/isNumeric.ts":
/*!************************************!*\
  !*** ./lib/utilities/isNumeric.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isNumeric = void 0;
function isNumeric(c) {
    return /^[0-9]+$/i.test(c);
}
exports.isNumeric = isNumeric;


/***/ }),

/***/ "./lib/utilities/isWhitespace.ts":
/*!***************************************!*\
  !*** ./lib/utilities/isWhitespace.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isWhitespace = void 0;
function isWhitespace(c) {
    return /\s/.test(c);
}
exports.isWhitespace = isWhitespace;


/***/ }),

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "./node_modules/commander/index.js":
/*!*****************************************!*\
  !*** ./node_modules/commander/index.js ***!
  \*****************************************/
/***/ ((module, exports, __webpack_require__) => {

/**
 * Module dependencies.
 */

const EventEmitter = (__webpack_require__(/*! events */ "events").EventEmitter);
const childProcess = __webpack_require__(/*! child_process */ "child_process");
const path = __webpack_require__(/*! path */ "path");
const fs = __webpack_require__(/*! fs */ "fs");

// @ts-check

// Although this is a class, methods are static in style to allow override using subclass or just functions.
class Help {
  constructor() {
    this.helpWidth = undefined;
    this.sortSubcommands = false;
    this.sortOptions = false;
  }

  /**
   * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
   *
   * @param {Command} cmd
   * @returns {Command[]}
   */

  visibleCommands(cmd) {
    const visibleCommands = cmd.commands.filter(cmd => !cmd._hidden);
    if (cmd._hasImplicitHelpCommand()) {
      // Create a command matching the implicit help command.
      const args = cmd._helpCommandnameAndArgs.split(/ +/);
      const helpCommand = cmd.createCommand(args.shift())
        .helpOption(false);
      helpCommand.description(cmd._helpCommandDescription);
      helpCommand._parseExpectedArgs(args);
      visibleCommands.push(helpCommand);
    }
    if (this.sortSubcommands) {
      visibleCommands.sort((a, b) => {
        return a.name().localeCompare(b.name());
      });
    }
    return visibleCommands;
  }

  /**
   * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
   *
   * @param {Command} cmd
   * @returns {Option[]}
   */

  visibleOptions(cmd) {
    const visibleOptions = cmd.options.filter((option) => !option.hidden);
    // Implicit help
    const showShortHelpFlag = cmd._hasHelpOption && cmd._helpShortFlag && !cmd._findOption(cmd._helpShortFlag);
    const showLongHelpFlag = cmd._hasHelpOption && !cmd._findOption(cmd._helpLongFlag);
    if (showShortHelpFlag || showLongHelpFlag) {
      let helpOption;
      if (!showShortHelpFlag) {
        helpOption = cmd.createOption(cmd._helpLongFlag, cmd._helpDescription);
      } else if (!showLongHelpFlag) {
        helpOption = cmd.createOption(cmd._helpShortFlag, cmd._helpDescription);
      } else {
        helpOption = cmd.createOption(cmd._helpFlags, cmd._helpDescription);
      }
      visibleOptions.push(helpOption);
    }
    if (this.sortOptions) {
      const getSortKey = (option) => {
        // WYSIWYG for order displayed in help with short before long, no special handling for negated.
        return option.short ? option.short.replace(/^-/, '') : option.long.replace(/^--/, '');
      };
      visibleOptions.sort((a, b) => {
        return getSortKey(a).localeCompare(getSortKey(b));
      });
    }
    return visibleOptions;
  }

  /**
   * Get an array of the arguments which have descriptions.
   *
   * @param {Command} cmd
   * @returns {{ term: string, description:string }[]}
   */

  visibleArguments(cmd) {
    if (cmd._argsDescription && cmd._args.length) {
      return cmd._args.map((argument) => {
        return { term: argument.name, description: cmd._argsDescription[argument.name] || '' };
      }, 0);
    }
    return [];
  }

  /**
   * Get the command term to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandTerm(cmd) {
    // Legacy. Ignores custom usage string, and nested commands.
    const args = cmd._args.map(arg => humanReadableArgName(arg)).join(' ');
    return cmd._name +
      (cmd._aliases[0] ? '|' + cmd._aliases[0] : '') +
      (cmd.options.length ? ' [options]' : '') + // simplistic check for non-help option
      (args ? ' ' + args : '');
  }

  /**
   * Get the option term to show in the list of options.
   *
   * @param {Option} option
   * @returns {string}
   */

  optionTerm(option) {
    return option.flags;
  }

  /**
   * Get the longest command term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestSubcommandTermLength(cmd, helper) {
    return helper.visibleCommands(cmd).reduce((max, command) => {
      return Math.max(max, helper.subcommandTerm(command).length);
    }, 0);
  };

  /**
   * Get the longest option term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestOptionTermLength(cmd, helper) {
    return helper.visibleOptions(cmd).reduce((max, option) => {
      return Math.max(max, helper.optionTerm(option).length);
    }, 0);
  };

  /**
   * Get the longest argument term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  longestArgumentTermLength(cmd, helper) {
    return helper.visibleArguments(cmd).reduce((max, argument) => {
      return Math.max(max, argument.term.length);
    }, 0);
  };

  /**
   * Get the command usage to be displayed at the top of the built-in help.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandUsage(cmd) {
    // Usage
    let cmdName = cmd._name;
    if (cmd._aliases[0]) {
      cmdName = cmdName + '|' + cmd._aliases[0];
    }
    let parentCmdNames = '';
    for (let parentCmd = cmd.parent; parentCmd; parentCmd = parentCmd.parent) {
      parentCmdNames = parentCmd.name() + ' ' + parentCmdNames;
    }
    return parentCmdNames + cmdName + ' ' + cmd.usage();
  }

  /**
   * Get the description for the command.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  commandDescription(cmd) {
    // @ts-ignore: overloaded return type
    return cmd.description();
  }

  /**
   * Get the command description to show in the list of subcommands.
   *
   * @param {Command} cmd
   * @returns {string}
   */

  subcommandDescription(cmd) {
    // @ts-ignore: overloaded return type
    return cmd.description();
  }

  /**
   * Get the option description to show in the list of options.
   *
   * @param {Option} option
   * @return {string}
   */

  optionDescription(option) {
    if (option.negate) {
      return option.description;
    }
    const extraInfo = [];
    if (option.argChoices) {
      extraInfo.push(
        // use stringify to match the display of the default value
        `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(', ')}`);
    }
    if (option.defaultValue !== undefined) {
      extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
    }
    if (extraInfo.length > 0) {
      return `${option.description} (${extraInfo.join(', ')})`;
    }
    return option.description;
  };

  /**
   * Generate the built-in help text.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {string}
   */

  formatHelp(cmd, helper) {
    const termWidth = helper.padWidth(cmd, helper);
    const helpWidth = helper.helpWidth || 80;
    const itemIndentWidth = 2;
    const itemSeparatorWidth = 2; // between term and description
    function formatItem(term, description) {
      if (description) {
        const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
        return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
      }
      return term;
    };
    function formatList(textArray) {
      return textArray.join('\n').replace(/^/gm, ' '.repeat(itemIndentWidth));
    }

    // Usage
    let output = [`Usage: ${helper.commandUsage(cmd)}`, ''];

    // Description
    const commandDescription = helper.commandDescription(cmd);
    if (commandDescription.length > 0) {
      output = output.concat([commandDescription, '']);
    }

    // Arguments
    const argumentList = helper.visibleArguments(cmd).map((argument) => {
      return formatItem(argument.term, argument.description);
    });
    if (argumentList.length > 0) {
      output = output.concat(['Arguments:', formatList(argumentList), '']);
    }

    // Options
    const optionList = helper.visibleOptions(cmd).map((option) => {
      return formatItem(helper.optionTerm(option), helper.optionDescription(option));
    });
    if (optionList.length > 0) {
      output = output.concat(['Options:', formatList(optionList), '']);
    }

    // Commands
    const commandList = helper.visibleCommands(cmd).map((cmd) => {
      return formatItem(helper.subcommandTerm(cmd), helper.subcommandDescription(cmd));
    });
    if (commandList.length > 0) {
      output = output.concat(['Commands:', formatList(commandList), '']);
    }

    return output.join('\n');
  }

  /**
   * Calculate the pad width from the maximum term length.
   *
   * @param {Command} cmd
   * @param {Help} helper
   * @returns {number}
   */

  padWidth(cmd, helper) {
    return Math.max(
      helper.longestOptionTermLength(cmd, helper),
      helper.longestSubcommandTermLength(cmd, helper),
      helper.longestArgumentTermLength(cmd, helper)
    );
  };

  /**
   * Wrap the given string to width characters per line, with lines after the first indented.
   * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
   *
   * @param {string} str
   * @param {number} width
   * @param {number} indent
   * @param {number} [minColumnWidth=40]
   * @return {string}
   *
   */

  wrap(str, width, indent, minColumnWidth = 40) {
    // Detect manually wrapped and indented strings by searching for line breaks
    // followed by multiple spaces/tabs.
    if (str.match(/[\n]\s+/)) return str;
    // Do not wrap if not enough room for a wrapped column of text (as could end up with a word per line).
    const columnWidth = width - indent;
    if (columnWidth < minColumnWidth) return str;

    const leadingStr = str.substr(0, indent);
    const columnText = str.substr(indent);

    const indentString = ' '.repeat(indent);
    const regex = new RegExp('.{1,' + (columnWidth - 1) + '}([\\s\u200B]|$)|[^\\s\u200B]+?([\\s\u200B]|$)', 'g');
    const lines = columnText.match(regex) || [];
    return leadingStr + lines.map((line, i) => {
      if (line.slice(-1) === '\n') {
        line = line.slice(0, line.length - 1);
      }
      return ((i > 0) ? indentString : '') + line.trimRight();
    }).join('\n');
  }
}

class Option {
  /**
   * Initialize a new `Option` with the given `flags` and `description`.
   *
   * @param {string} flags
   * @param {string} [description]
   */

  constructor(flags, description) {
    this.flags = flags;
    this.description = description || '';

    this.required = flags.includes('<'); // A value must be supplied when the option is specified.
    this.optional = flags.includes('['); // A value is optional when the option is specified.
    // variadic test ignores <value,...> et al which might be used to describe custom splitting of single argument
    this.variadic = /\w\.\.\.[>\]]$/.test(flags); // The option can take multiple values.
    this.mandatory = false; // The option must have a value after parsing, which usually means it must be specified on command line.
    const optionFlags = _parseOptionFlags(flags);
    this.short = optionFlags.shortFlag;
    this.long = optionFlags.longFlag;
    this.negate = false;
    if (this.long) {
      this.negate = this.long.startsWith('--no-');
    }
    this.defaultValue = undefined;
    this.defaultValueDescription = undefined;
    this.parseArg = undefined;
    this.hidden = false;
    this.argChoices = undefined;
  }

  /**
   * Set the default value, and optionally supply the description to be displayed in the help.
   *
   * @param {any} value
   * @param {string} [description]
   * @return {Option}
   */

  default(value, description) {
    this.defaultValue = value;
    this.defaultValueDescription = description;
    return this;
  };

  /**
   * Set the custom handler for processing CLI option arguments into option values.
   *
   * @param {Function} [fn]
   * @return {Option}
   */

  argParser(fn) {
    this.parseArg = fn;
    return this;
  };

  /**
   * Whether the option is mandatory and must have a value after parsing.
   *
   * @param {boolean} [mandatory=true]
   * @return {Option}
   */

  makeOptionMandatory(mandatory = true) {
    this.mandatory = !!mandatory;
    return this;
  };

  /**
   * Hide option in help.
   *
   * @param {boolean} [hide=true]
   * @return {Option}
   */

  hideHelp(hide = true) {
    this.hidden = !!hide;
    return this;
  };

  /**
   * @api private
   */

  _concatValue(value, previous) {
    if (previous === this.defaultValue || !Array.isArray(previous)) {
      return [value];
    }

    return previous.concat(value);
  }

  /**
   * Only allow option value to be one of choices.
   *
   * @param {string[]} values
   * @return {Option}
   */

  choices(values) {
    this.argChoices = values;
    this.parseArg = (arg, previous) => {
      if (!values.includes(arg)) {
        throw new InvalidOptionArgumentError(`Allowed choices are ${values.join(', ')}.`);
      }
      if (this.variadic) {
        return this._concatValue(arg, previous);
      }
      return arg;
    };
    return this;
  };

  /**
   * Return option name.
   *
   * @return {string}
   */

  name() {
    if (this.long) {
      return this.long.replace(/^--/, '');
    }
    return this.short.replace(/^-/, '');
  };

  /**
   * Return option name, in a camelcase format that can be used
   * as a object attribute key.
   *
   * @return {string}
   * @api private
   */

  attributeName() {
    return camelcase(this.name().replace(/^no-/, ''));
  };

  /**
   * Check if `arg` matches the short or long flag.
   *
   * @param {string} arg
   * @return {boolean}
   * @api private
   */

  is(arg) {
    return this.short === arg || this.long === arg;
  };
}

/**
 * CommanderError class
 * @class
 */
class CommanderError extends Error {
  /**
   * Constructs the CommanderError class
   * @param {number} exitCode suggested exit code which could be used with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @constructor
   */
  constructor(exitCode, code, message) {
    super(message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.code = code;
    this.exitCode = exitCode;
    this.nestedError = undefined;
  }
}

/**
 * InvalidOptionArgumentError class
 * @class
 */
class InvalidOptionArgumentError extends CommanderError {
  /**
   * Constructs the InvalidOptionArgumentError class
   * @param {string} [message] explanation of why argument is invalid
   * @constructor
   */
  constructor(message) {
    super(1, 'commander.invalidOptionArgument', message);
    // properly capture stack trace in Node.js
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
  }
}

class Command extends EventEmitter {
  /**
   * Initialize a new `Command`.
   *
   * @param {string} [name]
   */

  constructor(name) {
    super();
    this.commands = [];
    this.options = [];
    this.parent = null;
    this._allowUnknownOption = false;
    this._allowExcessArguments = true;
    this._args = [];
    this.rawArgs = null;
    this._scriptPath = null;
    this._name = name || '';
    this._optionValues = {};
    this._storeOptionsAsProperties = false;
    this._actionResults = [];
    this._actionHandler = null;
    this._executableHandler = false;
    this._executableFile = null; // custom name for executable
    this._defaultCommandName = null;
    this._exitCallback = null;
    this._aliases = [];
    this._combineFlagAndOptionalValue = true;
    this._description = '';
    this._argsDescription = undefined;
    this._enablePositionalOptions = false;
    this._passThroughOptions = false;

    // see .configureOutput() for docs
    this._outputConfiguration = {
      writeOut: (str) => process.stdout.write(str),
      writeErr: (str) => process.stderr.write(str),
      getOutHelpWidth: () => process.stdout.isTTY ? process.stdout.columns : undefined,
      getErrHelpWidth: () => process.stderr.isTTY ? process.stderr.columns : undefined,
      outputError: (str, write) => write(str)
    };

    this._hidden = false;
    this._hasHelpOption = true;
    this._helpFlags = '-h, --help';
    this._helpDescription = 'display help for command';
    this._helpShortFlag = '-h';
    this._helpLongFlag = '--help';
    this._addImplicitHelpCommand = undefined; // Deliberately undefined, not decided whether true or false
    this._helpCommandName = 'help';
    this._helpCommandnameAndArgs = 'help [command]';
    this._helpCommandDescription = 'display help for command';
    this._helpConfiguration = {};
  }

  /**
   * Define a command.
   *
   * There are two styles of command: pay attention to where to put the description.
   *
   * Examples:
   *
   *      // Command implemented using action handler (description is supplied separately to `.command`)
   *      program
   *        .command('clone <source> [destination]')
   *        .description('clone a repository into a newly created directory')
   *        .action((source, destination) => {
   *          console.log('clone command called');
   *        });
   *
   *      // Command implemented using separate executable file (description is second parameter to `.command`)
   *      program
   *        .command('start <service>', 'start named service')
   *        .command('stop [service]', 'stop named service, or all if no name supplied');
   *
   * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
   * @param {Object|string} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
   * @param {Object} [execOpts] - configuration options (for executable)
   * @return {Command} returns new command for action handler, or `this` for executable command
   */

  command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
    let desc = actionOptsOrExecDesc;
    let opts = execOpts;
    if (typeof desc === 'object' && desc !== null) {
      opts = desc;
      desc = null;
    }
    opts = opts || {};
    const args = nameAndArgs.split(/ +/);
    const cmd = this.createCommand(args.shift());

    if (desc) {
      cmd.description(desc);
      cmd._executableHandler = true;
    }
    if (opts.isDefault) this._defaultCommandName = cmd._name;

    cmd._outputConfiguration = this._outputConfiguration;

    cmd._hidden = !!(opts.noHelp || opts.hidden); // noHelp is deprecated old name for hidden
    cmd._hasHelpOption = this._hasHelpOption;
    cmd._helpFlags = this._helpFlags;
    cmd._helpDescription = this._helpDescription;
    cmd._helpShortFlag = this._helpShortFlag;
    cmd._helpLongFlag = this._helpLongFlag;
    cmd._helpCommandName = this._helpCommandName;
    cmd._helpCommandnameAndArgs = this._helpCommandnameAndArgs;
    cmd._helpCommandDescription = this._helpCommandDescription;
    cmd._helpConfiguration = this._helpConfiguration;
    cmd._exitCallback = this._exitCallback;
    cmd._storeOptionsAsProperties = this._storeOptionsAsProperties;
    cmd._combineFlagAndOptionalValue = this._combineFlagAndOptionalValue;
    cmd._allowExcessArguments = this._allowExcessArguments;
    cmd._enablePositionalOptions = this._enablePositionalOptions;

    cmd._executableFile = opts.executableFile || null; // Custom name for executable file, set missing to null to match constructor
    this.commands.push(cmd);
    cmd._parseExpectedArgs(args);
    cmd.parent = this;

    if (desc) return this;
    return cmd;
  };

  /**
   * Factory routine to create a new unattached command.
   *
   * See .command() for creating an attached subcommand, which uses this routine to
   * create the command. You can override createCommand to customise subcommands.
   *
   * @param {string} [name]
   * @return {Command} new command
   */

  createCommand(name) {
    return new Command(name);
  };

  /**
   * You can customise the help with a subclass of Help by overriding createHelp,
   * or by overriding Help properties using configureHelp().
   *
   * @return {Help}
   */

  createHelp() {
    return Object.assign(new Help(), this.configureHelp());
  };

  /**
   * You can customise the help by overriding Help properties using configureHelp(),
   * or with a subclass of Help by overriding createHelp().
   *
   * @param {Object} [configuration] - configuration options
   * @return {Command|Object} `this` command for chaining, or stored configuration
   */

  configureHelp(configuration) {
    if (configuration === undefined) return this._helpConfiguration;

    this._helpConfiguration = configuration;
    return this;
  }

  /**
   * The default output goes to stdout and stderr. You can customise this for special
   * applications. You can also customise the display of errors by overriding outputError.
   *
   * The configuration properties are all functions:
   *
   *    // functions to change where being written, stdout and stderr
   *    writeOut(str)
   *    writeErr(str)
   *    // matching functions to specify width for wrapping help
   *    getOutHelpWidth()
   *    getErrHelpWidth()
   *    // functions based on what is being written out
   *    outputError(str, write) // used for displaying errors, and not used for displaying help
   *
   * @param {Object} [configuration] - configuration options
   * @return {Command|Object} `this` command for chaining, or stored configuration
   */

  configureOutput(configuration) {
    if (configuration === undefined) return this._outputConfiguration;

    Object.assign(this._outputConfiguration, configuration);
    return this;
  }

  /**
   * Add a prepared subcommand.
   *
   * See .command() for creating an attached subcommand which inherits settings from its parent.
   *
   * @param {Command} cmd - new subcommand
   * @param {Object} [opts] - configuration options
   * @return {Command} `this` command for chaining
   */

  addCommand(cmd, opts) {
    if (!cmd._name) throw new Error('Command passed to .addCommand() must have a name');

    // To keep things simple, block automatic name generation for deeply nested executables.
    // Fail fast and detect when adding rather than later when parsing.
    function checkExplicitNames(commandArray) {
      commandArray.forEach((cmd) => {
        if (cmd._executableHandler && !cmd._executableFile) {
          throw new Error(`Must specify executableFile for deeply nested executable: ${cmd.name()}`);
        }
        checkExplicitNames(cmd.commands);
      });
    }
    checkExplicitNames(cmd.commands);

    opts = opts || {};
    if (opts.isDefault) this._defaultCommandName = cmd._name;
    if (opts.noHelp || opts.hidden) cmd._hidden = true; // modifying passed command due to existing implementation

    this.commands.push(cmd);
    cmd.parent = this;
    return this;
  };

  /**
   * Define argument syntax for the command.
   */

  arguments(desc) {
    return this._parseExpectedArgs(desc.split(/ +/));
  };

  /**
   * Override default decision whether to add implicit help command.
   *
   *    addHelpCommand() // force on
   *    addHelpCommand(false); // force off
   *    addHelpCommand('help [cmd]', 'display help for [cmd]'); // force on with custom details
   *
   * @return {Command} `this` command for chaining
   */

  addHelpCommand(enableOrNameAndArgs, description) {
    if (enableOrNameAndArgs === false) {
      this._addImplicitHelpCommand = false;
    } else {
      this._addImplicitHelpCommand = true;
      if (typeof enableOrNameAndArgs === 'string') {
        this._helpCommandName = enableOrNameAndArgs.split(' ')[0];
        this._helpCommandnameAndArgs = enableOrNameAndArgs;
      }
      this._helpCommandDescription = description || this._helpCommandDescription;
    }
    return this;
  };

  /**
   * @return {boolean}
   * @api private
   */

  _hasImplicitHelpCommand() {
    if (this._addImplicitHelpCommand === undefined) {
      return this.commands.length && !this._actionHandler && !this._findCommand('help');
    }
    return this._addImplicitHelpCommand;
  };

  /**
   * Parse expected `args`.
   *
   * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
   *
   * @param {Array} args
   * @return {Command} `this` command for chaining
   * @api private
   */

  _parseExpectedArgs(args) {
    if (!args.length) return;
    args.forEach((arg) => {
      const argDetails = {
        required: false,
        name: '',
        variadic: false
      };

      switch (arg[0]) {
        case '<':
          argDetails.required = true;
          argDetails.name = arg.slice(1, -1);
          break;
        case '[':
          argDetails.name = arg.slice(1, -1);
          break;
      }

      if (argDetails.name.length > 3 && argDetails.name.slice(-3) === '...') {
        argDetails.variadic = true;
        argDetails.name = argDetails.name.slice(0, -3);
      }
      if (argDetails.name) {
        this._args.push(argDetails);
      }
    });
    this._args.forEach((arg, i) => {
      if (arg.variadic && i < this._args.length - 1) {
        throw new Error(`only the last argument can be variadic '${arg.name}'`);
      }
    });
    return this;
  };

  /**
   * Register callback to use as replacement for calling process.exit.
   *
   * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
   * @return {Command} `this` command for chaining
   */

  exitOverride(fn) {
    if (fn) {
      this._exitCallback = fn;
    } else {
      this._exitCallback = (err) => {
        if (err.code !== 'commander.executeSubCommandAsync') {
          throw err;
        } else {
          // Async callback from spawn events, not useful to throw.
        }
      };
    }
    return this;
  };

  /**
   * Call process.exit, and _exitCallback if defined.
   *
   * @param {number} exitCode exit code for using with process.exit
   * @param {string} code an id string representing the error
   * @param {string} message human-readable description of the error
   * @return never
   * @api private
   */

  _exit(exitCode, code, message) {
    if (this._exitCallback) {
      this._exitCallback(new CommanderError(exitCode, code, message));
      // Expecting this line is not reached.
    }
    process.exit(exitCode);
  };

  /**
   * Register callback `fn` for the command.
   *
   * Examples:
   *
   *      program
   *        .command('help')
   *        .description('display verbose help')
   *        .action(function() {
   *           // output help here
   *        });
   *
   * @param {Function} fn
   * @return {Command} `this` command for chaining
   */

  action(fn) {
    const listener = (args) => {
      // The .action callback takes an extra parameter which is the command or options.
      const expectedArgsCount = this._args.length;
      const actionArgs = args.slice(0, expectedArgsCount);
      if (this._storeOptionsAsProperties) {
        actionArgs[expectedArgsCount] = this; // backwards compatible "options"
      } else {
        actionArgs[expectedArgsCount] = this.opts();
      }
      actionArgs.push(this);

      const actionResult = fn.apply(this, actionArgs);
      // Remember result in case it is async. Assume parseAsync getting called on root.
      let rootCommand = this;
      while (rootCommand.parent) {
        rootCommand = rootCommand.parent;
      }
      rootCommand._actionResults.push(actionResult);
    };
    this._actionHandler = listener;
    return this;
  };

  /**
   * Factory routine to create a new unattached option.
   *
   * See .option() for creating an attached option, which uses this routine to
   * create the option. You can override createOption to return a custom option.
   *
   * @param {string} flags
   * @param {string} [description]
   * @return {Option} new option
   */

  createOption(flags, description) {
    return new Option(flags, description);
  };

  /**
   * Add an option.
   *
   * @param {Option} option
   * @return {Command} `this` command for chaining
   */
  addOption(option) {
    const oname = option.name();
    const name = option.attributeName();

    let defaultValue = option.defaultValue;

    // preassign default value for --no-*, [optional], <required>, or plain flag if boolean value
    if (option.negate || option.optional || option.required || typeof defaultValue === 'boolean') {
      // when --no-foo we make sure default is true, unless a --foo option is already defined
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, '--');
        defaultValue = this._findOption(positiveLongFlag) ? this._getOptionValue(name) : true;
      }
      // preassign only if we have a default
      if (defaultValue !== undefined) {
        this._setOptionValue(name, defaultValue);
      }
    }

    // register the option
    this.options.push(option);

    // when it's passed assign the value
    // and conditionally invoke the callback
    this.on('option:' + oname, (val) => {
      const oldValue = this._getOptionValue(name);

      // custom processing
      if (val !== null && option.parseArg) {
        try {
          val = option.parseArg(val, oldValue === undefined ? defaultValue : oldValue);
        } catch (err) {
          if (err.code === 'commander.invalidOptionArgument') {
            const message = `error: option '${option.flags}' argument '${val}' is invalid. ${err.message}`;
            this._displayError(err.exitCode, err.code, message);
          }
          throw err;
        }
      } else if (val !== null && option.variadic) {
        val = option._concatValue(val, oldValue);
      }

      // unassigned or boolean value
      if (typeof oldValue === 'boolean' || typeof oldValue === 'undefined') {
        // if no value, negate false, and we have a default, then use it!
        if (val == null) {
          this._setOptionValue(name, option.negate
            ? false
            : defaultValue || true);
        } else {
          this._setOptionValue(name, val);
        }
      } else if (val !== null) {
        // reassign
        this._setOptionValue(name, option.negate ? false : val);
      }
    });

    return this;
  }

  /**
   * Internal implementation shared by .option() and .requiredOption()
   *
   * @api private
   */
  _optionEx(config, flags, description, fn, defaultValue) {
    const option = this.createOption(flags, description);
    option.makeOptionMandatory(!!config.mandatory);
    if (typeof fn === 'function') {
      option.default(defaultValue).argParser(fn);
    } else if (fn instanceof RegExp) {
      // deprecated
      const regex = fn;
      fn = (val, def) => {
        const m = regex.exec(val);
        return m ? m[0] : def;
      };
      option.default(defaultValue).argParser(fn);
    } else {
      option.default(fn);
    }

    return this.addOption(option);
  }

  /**
   * Define option with `flags`, `description` and optional
   * coercion `fn`.
   *
   * The `flags` string contains the short and/or long flags,
   * separated by comma, a pipe or space. The following are all valid
   * all will output this way when `--help` is used.
   *
   *    "-p, --pepper"
   *    "-p|--pepper"
   *    "-p --pepper"
   *
   * Examples:
   *
   *     // simple boolean defaulting to undefined
   *     program.option('-p, --pepper', 'add pepper');
   *
   *     program.pepper
   *     // => undefined
   *
   *     --pepper
   *     program.pepper
   *     // => true
   *
   *     // simple boolean defaulting to true (unless non-negated option is also defined)
   *     program.option('-C, --no-cheese', 'remove cheese');
   *
   *     program.cheese
   *     // => true
   *
   *     --no-cheese
   *     program.cheese
   *     // => false
   *
   *     // required argument
   *     program.option('-C, --chdir <path>', 'change the working directory');
   *
   *     --chdir /tmp
   *     program.chdir
   *     // => "/tmp"
   *
   *     // optional argument
   *     program.option('-c, --cheese [type]', 'add cheese [marble]');
   *
   * @param {string} flags
   * @param {string} [description]
   * @param {Function|*} [fn] - custom option processing function or default value
   * @param {*} [defaultValue]
   * @return {Command} `this` command for chaining
   */

  option(flags, description, fn, defaultValue) {
    return this._optionEx({}, flags, description, fn, defaultValue);
  };

  /**
  * Add a required option which must have a value after parsing. This usually means
  * the option must be specified on the command line. (Otherwise the same as .option().)
  *
  * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
  *
  * @param {string} flags
  * @param {string} [description]
  * @param {Function|*} [fn] - custom option processing function or default value
  * @param {*} [defaultValue]
  * @return {Command} `this` command for chaining
  */

  requiredOption(flags, description, fn, defaultValue) {
    return this._optionEx({ mandatory: true }, flags, description, fn, defaultValue);
  };

  /**
   * Alter parsing of short flags with optional values.
   *
   * Examples:
   *
   *    // for `.option('-f,--flag [value]'):
   *    .combineFlagAndOptionalValue(true)  // `-f80` is treated like `--flag=80`, this is the default behaviour
   *    .combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
   *
   * @param {Boolean} [combine=true] - if `true` or omitted, an optional value can be specified directly after the flag.
   */
  combineFlagAndOptionalValue(combine = true) {
    this._combineFlagAndOptionalValue = !!combine;
    return this;
  };

  /**
   * Allow unknown options on the command line.
   *
   * @param {Boolean} [allowUnknown=true] - if `true` or omitted, no error will be thrown
   * for unknown options.
   */
  allowUnknownOption(allowUnknown = true) {
    this._allowUnknownOption = !!allowUnknown;
    return this;
  };

  /**
   * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
   *
   * @param {Boolean} [allowExcess=true] - if `true` or omitted, no error will be thrown
   * for excess arguments.
   */
  allowExcessArguments(allowExcess = true) {
    this._allowExcessArguments = !!allowExcess;
    return this;
  };

  /**
   * Enable positional options. Positional means global options are specified before subcommands which lets
   * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
   * The default behaviour is non-positional and global options may appear anywhere on the command line.
   *
   * @param {Boolean} [positional=true]
   */
  enablePositionalOptions(positional = true) {
    this._enablePositionalOptions = !!positional;
    return this;
  };

  /**
   * Pass through options that come after command-arguments rather than treat them as command-options,
   * so actual command-options come before command-arguments. Turning this on for a subcommand requires
   * positional options to have been enabled on the program (parent commands).
   * The default behaviour is non-positional and options may appear before or after command-arguments.
   *
   * @param {Boolean} [passThrough=true]
   * for unknown options.
   */
  passThroughOptions(passThrough = true) {
    this._passThroughOptions = !!passThrough;
    if (!!this.parent && passThrough && !this.parent._enablePositionalOptions) {
      throw new Error('passThroughOptions can not be used without turning on enablePositionalOptions for parent command(s)');
    }
    return this;
  };

  /**
    * Whether to store option values as properties on command object,
    * or store separately (specify false). In both cases the option values can be accessed using .opts().
    *
    * @param {boolean} [storeAsProperties=true]
    * @return {Command} `this` command for chaining
    */

  storeOptionsAsProperties(storeAsProperties = true) {
    this._storeOptionsAsProperties = !!storeAsProperties;
    if (this.options.length) {
      throw new Error('call .storeOptionsAsProperties() before adding options');
    }
    return this;
  };

  /**
   * Store option value
   *
   * @param {string} key
   * @param {Object} value
   * @api private
   */

  _setOptionValue(key, value) {
    if (this._storeOptionsAsProperties) {
      this[key] = value;
    } else {
      this._optionValues[key] = value;
    }
  };

  /**
   * Retrieve option value
   *
   * @param {string} key
   * @return {Object} value
   * @api private
   */

  _getOptionValue(key) {
    if (this._storeOptionsAsProperties) {
      return this[key];
    }
    return this._optionValues[key];
  };

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * Examples:
   *
   *      program.parse(process.argv);
   *      program.parse(); // implicitly use process.argv and auto-detect node vs electron conventions
   *      program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv] - optional, defaults to process.argv
   * @param {Object} [parseOptions] - optionally specify style of options with from: node/user/electron
   * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
   * @return {Command} `this` command for chaining
   */

  parse(argv, parseOptions) {
    if (argv !== undefined && !Array.isArray(argv)) {
      throw new Error('first parameter to parse must be array or undefined');
    }
    parseOptions = parseOptions || {};

    // Default to using process.argv
    if (argv === undefined) {
      argv = process.argv;
      // @ts-ignore: unknown property
      if (process.versions && process.versions.electron) {
        parseOptions.from = 'electron';
      }
    }
    this.rawArgs = argv.slice();

    // make it a little easier for callers by supporting various argv conventions
    let userArgs;
    switch (parseOptions.from) {
      case undefined:
      case 'node':
        this._scriptPath = argv[1];
        userArgs = argv.slice(2);
        break;
      case 'electron':
        // @ts-ignore: unknown property
        if (process.defaultApp) {
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
        } else {
          userArgs = argv.slice(1);
        }
        break;
      case 'user':
        userArgs = argv.slice(0);
        break;
      default:
        throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
    }
    if (!this._scriptPath && __webpack_require__.c[__webpack_require__.s]) {
      this._scriptPath = __webpack_require__.c[__webpack_require__.s].filename;
    }

    // Guess name, used in usage in help.
    this._name = this._name || (this._scriptPath && path.basename(this._scriptPath, path.extname(this._scriptPath)));

    // Let's go!
    this._parseCommand([], userArgs);

    return this;
  };

  /**
   * Parse `argv`, setting options and invoking commands when defined.
   *
   * Use parseAsync instead of parse if any of your action handlers are async. Returns a Promise.
   *
   * The default expectation is that the arguments are from node and have the application as argv[0]
   * and the script being run in argv[1], with user parameters after that.
   *
   * Examples:
   *
   *      program.parseAsync(process.argv);
   *      program.parseAsync(); // implicitly use process.argv and auto-detect node vs electron conventions
   *      program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
   *
   * @param {string[]} [argv]
   * @param {Object} [parseOptions]
   * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
   * @return {Promise}
   */

  parseAsync(argv, parseOptions) {
    this.parse(argv, parseOptions);
    return Promise.all(this._actionResults).then(() => this);
  };

  /**
   * Execute a sub-command executable.
   *
   * @api private
   */

  _executeSubCommand(subcommand, args) {
    args = args.slice();
    let launchWithNode = false; // Use node for source targets so do not need to get permissions correct, and on Windows.
    const sourceExt = ['.js', '.ts', '.tsx', '.mjs', '.cjs'];

    // Not checking for help first. Unlikely to have mandatory and executable, and can't robustly test for help flags in external command.
    this._checkForMissingMandatoryOptions();

    // Want the entry script as the reference for command name and directory for searching for other files.
    let scriptPath = this._scriptPath;
    // Fallback in case not set, due to how Command created or called.
    if (!scriptPath && __webpack_require__.c[__webpack_require__.s]) {
      scriptPath = __webpack_require__.c[__webpack_require__.s].filename;
    }

    let baseDir;
    try {
      const resolvedLink = fs.realpathSync(scriptPath);
      baseDir = path.dirname(resolvedLink);
    } catch (e) {
      baseDir = '.'; // dummy, probably not going to find executable!
    }

    // name of the subcommand, like `pm-install`
    let bin = path.basename(scriptPath, path.extname(scriptPath)) + '-' + subcommand._name;
    if (subcommand._executableFile) {
      bin = subcommand._executableFile;
    }

    const localBin = path.join(baseDir, bin);
    if (fs.existsSync(localBin)) {
      // prefer local `./<bin>` to bin in the $PATH
      bin = localBin;
    } else {
      // Look for source files.
      sourceExt.forEach((ext) => {
        if (fs.existsSync(`${localBin}${ext}`)) {
          bin = `${localBin}${ext}`;
        }
      });
    }
    launchWithNode = sourceExt.includes(path.extname(bin));

    let proc;
    if (process.platform !== 'win32') {
      if (launchWithNode) {
        args.unshift(bin);
        // add executable arguments to spawn
        args = incrementNodeInspectorPort(process.execArgv).concat(args);

        proc = childProcess.spawn(process.argv[0], args, { stdio: 'inherit' });
      } else {
        proc = childProcess.spawn(bin, args, { stdio: 'inherit' });
      }
    } else {
      args.unshift(bin);
      // add executable arguments to spawn
      args = incrementNodeInspectorPort(process.execArgv).concat(args);
      proc = childProcess.spawn(process.execPath, args, { stdio: 'inherit' });
    }

    const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
    signals.forEach((signal) => {
      // @ts-ignore
      process.on(signal, () => {
        if (proc.killed === false && proc.exitCode === null) {
          proc.kill(signal);
        }
      });
    });

    // By default terminate process when spawned process terminates.
    // Suppressing the exit if exitCallback defined is a bit messy and of limited use, but does allow process to stay running!
    const exitCallback = this._exitCallback;
    if (!exitCallback) {
      proc.on('close', process.exit.bind(process));
    } else {
      proc.on('close', () => {
        exitCallback(new CommanderError(process.exitCode || 0, 'commander.executeSubCommandAsync', '(close)'));
      });
    }
    proc.on('error', (err) => {
      // @ts-ignore
      if (err.code === 'ENOENT') {
        const executableMissing = `'${bin}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name`;
        throw new Error(executableMissing);
      // @ts-ignore
      } else if (err.code === 'EACCES') {
        throw new Error(`'${bin}' not executable`);
      }
      if (!exitCallback) {
        process.exit(1);
      } else {
        const wrappedError = new CommanderError(1, 'commander.executeSubCommandAsync', '(error)');
        wrappedError.nestedError = err;
        exitCallback(wrappedError);
      }
    });

    // Store the reference to the child process
    this.runningCommand = proc;
  };

  /**
   * @api private
   */
  _dispatchSubcommand(commandName, operands, unknown) {
    const subCommand = this._findCommand(commandName);
    if (!subCommand) this.help({ error: true });

    if (subCommand._executableHandler) {
      this._executeSubCommand(subCommand, operands.concat(unknown));
    } else {
      subCommand._parseCommand(operands, unknown);
    }
  };

  /**
   * Process arguments in context of this command.
   *
   * @api private
   */

  _parseCommand(operands, unknown) {
    const parsed = this.parseOptions(unknown);
    operands = operands.concat(parsed.operands);
    unknown = parsed.unknown;
    this.args = operands.concat(unknown);

    if (operands && this._findCommand(operands[0])) {
      this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
    } else if (this._hasImplicitHelpCommand() && operands[0] === this._helpCommandName) {
      if (operands.length === 1) {
        this.help();
      } else {
        this._dispatchSubcommand(operands[1], [], [this._helpLongFlag]);
      }
    } else if (this._defaultCommandName) {
      outputHelpIfRequested(this, unknown); // Run the help for default command from parent rather than passing to default command
      this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
    } else {
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        // probably missing subcommand and no handler, user needs help
        this.help({ error: true });
      }

      outputHelpIfRequested(this, parsed.unknown);
      this._checkForMissingMandatoryOptions();

      // We do not always call this check to avoid masking a "better" error, like unknown command.
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };

      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        // Check expected arguments and collect variadic together.
        const args = this.args.slice();
        this._args.forEach((arg, i) => {
          if (arg.required && args[i] == null) {
            this.missingArgument(arg.name);
          } else if (arg.variadic) {
            args[i] = args.splice(i);
            args.length = Math.min(i + 1, args.length);
          }
        });
        if (args.length > this._args.length) {
          this._excessArguments(args);
        }

        this._actionHandler(args);
        if (this.parent) this.parent.emit(commandEvent, operands, unknown); // legacy
      } else if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this.parent.emit(commandEvent, operands, unknown); // legacy
      } else if (operands.length) {
        if (this._findCommand('*')) { // legacy default command
          this._dispatchSubcommand('*', operands, unknown);
        } else if (this.listenerCount('command:*')) {
          // skip option check, emit event for possible misspelling suggestion
          this.emit('command:*', operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
        }
      } else if (this.commands.length) {
        // This command has subcommands and nothing hooked up at this level, so display help.
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        // fall through for caller to handle after calling .parse()
      }
    }
  };

  /**
   * Find matching command.
   *
   * @api private
   */
  _findCommand(name) {
    if (!name) return undefined;
    return this.commands.find(cmd => cmd._name === name || cmd._aliases.includes(name));
  };

  /**
   * Return an option matching `arg` if any.
   *
   * @param {string} arg
   * @return {Option}
   * @api private
   */

  _findOption(arg) {
    return this.options.find(option => option.is(arg));
  };

  /**
   * Display an error message if a mandatory option does not have a value.
   * Lazy calling after checking for help flags from leaf subcommand.
   *
   * @api private
   */

  _checkForMissingMandatoryOptions() {
    // Walk up hierarchy so can call in subcommand after checking for displaying help.
    for (let cmd = this; cmd; cmd = cmd.parent) {
      cmd.options.forEach((anOption) => {
        if (anOption.mandatory && (cmd._getOptionValue(anOption.attributeName()) === undefined)) {
          cmd.missingMandatoryOptionValue(anOption);
        }
      });
    }
  };

  /**
   * Parse options from `argv` removing known options,
   * and return argv split into operands and unknown arguments.
   *
   * Examples:
   *
   *    argv => operands, unknown
   *    --known kkk op => [op], []
   *    op --known kkk => [op], []
   *    sub --unknown uuu op => [sub], [--unknown uuu op]
   *    sub -- --unknown uuu op => [sub --unknown uuu op], []
   *
   * @param {String[]} argv
   * @return {{operands: String[], unknown: String[]}}
   */

  parseOptions(argv) {
    const operands = []; // operands, not options or values
    const unknown = []; // first unknown option and remaining unknown args
    let dest = operands;
    const args = argv.slice();

    function maybeOption(arg) {
      return arg.length > 1 && arg[0] === '-';
    }

    // parse options
    let activeVariadicOption = null;
    while (args.length) {
      const arg = args.shift();

      // literal
      if (arg === '--') {
        if (dest === unknown) dest.push(arg);
        dest.push(...args);
        break;
      }

      if (activeVariadicOption && !maybeOption(arg)) {
        this.emit(`option:${activeVariadicOption.name()}`, arg);
        continue;
      }
      activeVariadicOption = null;

      if (maybeOption(arg)) {
        const option = this._findOption(arg);
        // recognised option, call listener to assign value with possible custom processing
        if (option) {
          if (option.required) {
            const value = args.shift();
            if (value === undefined) this.optionMissingArgument(option);
            this.emit(`option:${option.name()}`, value);
          } else if (option.optional) {
            let value = null;
            // historical behaviour is optional value is following arg unless an option
            if (args.length > 0 && !maybeOption(args[0])) {
              value = args.shift();
            }
            this.emit(`option:${option.name()}`, value);
          } else { // boolean flag
            this.emit(`option:${option.name()}`);
          }
          activeVariadicOption = option.variadic ? option : null;
          continue;
        }
      }

      // Look for combo options following single dash, eat first one if known.
      if (arg.length > 2 && arg[0] === '-' && arg[1] !== '-') {
        const option = this._findOption(`-${arg[1]}`);
        if (option) {
          if (option.required || (option.optional && this._combineFlagAndOptionalValue)) {
            // option with value following in same argument
            this.emit(`option:${option.name()}`, arg.slice(2));
          } else {
            // boolean option, emit and put back remainder of arg for further processing
            this.emit(`option:${option.name()}`);
            args.unshift(`-${arg.slice(2)}`);
          }
          continue;
        }
      }

      // Look for known long flag with value, like --foo=bar
      if (/^--[^=]+=/.test(arg)) {
        const index = arg.indexOf('=');
        const option = this._findOption(arg.slice(0, index));
        if (option && (option.required || option.optional)) {
          this.emit(`option:${option.name()}`, arg.slice(index + 1));
          continue;
        }
      }

      // Not a recognised option by this command.
      // Might be a command-argument, or subcommand option, or unknown option, or help command or option.

      // An unknown option means further arguments also classified as unknown so can be reprocessed by subcommands.
      if (maybeOption(arg)) {
        dest = unknown;
      }

      // If using positionalOptions, stop processing our options at subcommand.
      if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
        if (this._findCommand(arg)) {
          operands.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        } else if (arg === this._helpCommandName && this._hasImplicitHelpCommand()) {
          operands.push(arg);
          if (args.length > 0) operands.push(...args);
          break;
        } else if (this._defaultCommandName) {
          unknown.push(arg);
          if (args.length > 0) unknown.push(...args);
          break;
        }
      }

      // If using passThroughOptions, stop processing options at first command-argument.
      if (this._passThroughOptions) {
        dest.push(arg);
        if (args.length > 0) dest.push(...args);
        break;
      }

      // add arg
      dest.push(arg);
    }

    return { operands, unknown };
  };

  /**
   * Return an object containing options as key-value pairs
   *
   * @return {Object}
   */
  opts() {
    if (this._storeOptionsAsProperties) {
      // Preserve original behaviour so backwards compatible when still using properties
      const result = {};
      const len = this.options.length;

      for (let i = 0; i < len; i++) {
        const key = this.options[i].attributeName();
        result[key] = key === this._versionOptionName ? this._version : this[key];
      }
      return result;
    }

    return this._optionValues;
  };

  /**
   * Internal bottleneck for handling of parsing errors.
   *
   * @api private
   */
  _displayError(exitCode, code, message) {
    this._outputConfiguration.outputError(`${message}\n`, this._outputConfiguration.writeErr);
    this._exit(exitCode, code, message);
  }

  /**
   * Argument `name` is missing.
   *
   * @param {string} name
   * @api private
   */

  missingArgument(name) {
    const message = `error: missing required argument '${name}'`;
    this._displayError(1, 'commander.missingArgument', message);
  };

  /**
   * `Option` is missing an argument.
   *
   * @param {Option} option
   * @api private
   */

  optionMissingArgument(option) {
    const message = `error: option '${option.flags}' argument missing`;
    this._displayError(1, 'commander.optionMissingArgument', message);
  };

  /**
   * `Option` does not have a value, and is a mandatory option.
   *
   * @param {Option} option
   * @api private
   */

  missingMandatoryOptionValue(option) {
    const message = `error: required option '${option.flags}' not specified`;
    this._displayError(1, 'commander.missingMandatoryOptionValue', message);
  };

  /**
   * Unknown option `flag`.
   *
   * @param {string} flag
   * @api private
   */

  unknownOption(flag) {
    if (this._allowUnknownOption) return;
    const message = `error: unknown option '${flag}'`;
    this._displayError(1, 'commander.unknownOption', message);
  };

  /**
   * Excess arguments, more than expected.
   *
   * @param {string[]} receivedArgs
   * @api private
   */

  _excessArguments(receivedArgs) {
    if (this._allowExcessArguments) return;

    const expected = this._args.length;
    const s = (expected === 1) ? '' : 's';
    const forSubcommand = this.parent ? ` for '${this.name()}'` : '';
    const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
    this._displayError(1, 'commander.excessArguments', message);
  };

  /**
   * Unknown command.
   *
   * @api private
   */

  unknownCommand() {
    const partCommands = [this.name()];
    for (let parentCmd = this.parent; parentCmd; parentCmd = parentCmd.parent) {
      partCommands.unshift(parentCmd.name());
    }
    const fullCommand = partCommands.join(' ');
    const message = `error: unknown command '${this.args[0]}'.` +
      (this._hasHelpOption ? ` See '${fullCommand} ${this._helpLongFlag}'.` : '');
    this._displayError(1, 'commander.unknownCommand', message);
  };

  /**
   * Set the program version to `str`.
   *
   * This method auto-registers the "-V, --version" flag
   * which will print the version number when passed.
   *
   * You can optionally supply the  flags and description to override the defaults.
   *
   * @param {string} str
   * @param {string} [flags]
   * @param {string} [description]
   * @return {this | string} `this` command for chaining, or version string if no arguments
   */

  version(str, flags, description) {
    if (str === undefined) return this._version;
    this._version = str;
    flags = flags || '-V, --version';
    description = description || 'output the version number';
    const versionOption = this.createOption(flags, description);
    this._versionOptionName = versionOption.attributeName();
    this.options.push(versionOption);
    this.on('option:' + versionOption.name(), () => {
      this._outputConfiguration.writeOut(`${str}\n`);
      this._exit(0, 'commander.version', str);
    });
    return this;
  };

  /**
   * Set the description to `str`.
   *
   * @param {string} [str]
   * @param {Object} [argsDescription]
   * @return {string|Command}
   */
  description(str, argsDescription) {
    if (str === undefined && argsDescription === undefined) return this._description;
    this._description = str;
    this._argsDescription = argsDescription;
    return this;
  };

  /**
   * Set an alias for the command.
   *
   * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
   *
   * @param {string} [alias]
   * @return {string|Command}
   */

  alias(alias) {
    if (alias === undefined) return this._aliases[0]; // just return first, for backwards compatibility

    let command = this;
    if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
      // assume adding alias for last added executable subcommand, rather than this
      command = this.commands[this.commands.length - 1];
    }

    if (alias === command._name) throw new Error('Command alias can\'t be the same as its name');

    command._aliases.push(alias);
    return this;
  };

  /**
   * Set aliases for the command.
   *
   * Only the first alias is shown in the auto-generated help.
   *
   * @param {string[]} [aliases]
   * @return {string[]|Command}
   */

  aliases(aliases) {
    // Getter for the array of aliases is the main reason for having aliases() in addition to alias().
    if (aliases === undefined) return this._aliases;

    aliases.forEach((alias) => this.alias(alias));
    return this;
  };

  /**
   * Set / get the command usage `str`.
   *
   * @param {string} [str]
   * @return {String|Command}
   */

  usage(str) {
    if (str === undefined) {
      if (this._usage) return this._usage;

      const args = this._args.map((arg) => {
        return humanReadableArgName(arg);
      });
      return [].concat(
        (this.options.length || this._hasHelpOption ? '[options]' : []),
        (this.commands.length ? '[command]' : []),
        (this._args.length ? args : [])
      ).join(' ');
    }

    this._usage = str;
    return this;
  };

  /**
   * Get or set the name of the command
   *
   * @param {string} [str]
   * @return {string|Command}
   */

  name(str) {
    if (str === undefined) return this._name;
    this._name = str;
    return this;
  };

  /**
   * Return program help documentation.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
   * @return {string}
   */

  helpInformation(contextOptions) {
    const helper = this.createHelp();
    if (helper.helpWidth === undefined) {
      helper.helpWidth = (contextOptions && contextOptions.error) ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
    }
    return helper.formatHelp(this, helper);
  };

  /**
   * @api private
   */

  _getHelpContext(contextOptions) {
    contextOptions = contextOptions || {};
    const context = { error: !!contextOptions.error };
    let write;
    if (context.error) {
      write = (arg) => this._outputConfiguration.writeErr(arg);
    } else {
      write = (arg) => this._outputConfiguration.writeOut(arg);
    }
    context.write = contextOptions.write || write;
    context.command = this;
    return context;
  }

  /**
   * Output help information for this command.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  outputHelp(contextOptions) {
    let deprecatedCallback;
    if (typeof contextOptions === 'function') {
      deprecatedCallback = contextOptions;
      contextOptions = undefined;
    }
    const context = this._getHelpContext(contextOptions);

    const groupListeners = [];
    let command = this;
    while (command) {
      groupListeners.push(command); // ordered from current command to root
      command = command.parent;
    }

    groupListeners.slice().reverse().forEach(command => command.emit('beforeAllHelp', context));
    this.emit('beforeHelp', context);

    let helpInformation = this.helpInformation(context);
    if (deprecatedCallback) {
      helpInformation = deprecatedCallback(helpInformation);
      if (typeof helpInformation !== 'string' && !Buffer.isBuffer(helpInformation)) {
        throw new Error('outputHelp callback must return a string or a Buffer');
      }
    }
    context.write(helpInformation);

    this.emit(this._helpLongFlag); // deprecated
    this.emit('afterHelp', context);
    groupListeners.forEach(command => command.emit('afterAllHelp', context));
  };

  /**
   * You can pass in flags and a description to override the help
   * flags and help description for your command. Pass in false to
   * disable the built-in help option.
   *
   * @param {string | boolean} [flags]
   * @param {string} [description]
   * @return {Command} `this` command for chaining
   */

  helpOption(flags, description) {
    if (typeof flags === 'boolean') {
      this._hasHelpOption = flags;
      return this;
    }
    this._helpFlags = flags || this._helpFlags;
    this._helpDescription = description || this._helpDescription;

    const helpFlags = _parseOptionFlags(this._helpFlags);
    this._helpShortFlag = helpFlags.shortFlag;
    this._helpLongFlag = helpFlags.longFlag;

    return this;
  };

  /**
   * Output help information and exit.
   *
   * Outputs built-in help, and custom text added using `.addHelpText()`.
   *
   * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
   */

  help(contextOptions) {
    this.outputHelp(contextOptions);
    let exitCode = process.exitCode || 0;
    if (exitCode === 0 && contextOptions && typeof contextOptions !== 'function' && contextOptions.error) {
      exitCode = 1;
    }
    // message: do not have all displayed text available so only passing placeholder.
    this._exit(exitCode, 'commander.help', '(outputHelp)');
  };

  /**
   * Add additional text to be displayed with the built-in help.
   *
   * Position is 'before' or 'after' to affect just this command,
   * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
   *
   * @param {string} position - before or after built-in help
   * @param {string | Function} text - string to add, or a function returning a string
   * @return {Command} `this` command for chaining
   */
  addHelpText(position, text) {
    const allowedValues = ['beforeAll', 'before', 'after', 'afterAll'];
    if (!allowedValues.includes(position)) {
      throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
    }
    const helpEvent = `${position}Help`;
    this.on(helpEvent, (context) => {
      let helpStr;
      if (typeof text === 'function') {
        helpStr = text({ error: context.error, command: context.command });
      } else {
        helpStr = text;
      }
      // Ignore falsy value when nothing to output.
      if (helpStr) {
        context.write(`${helpStr}\n`);
      }
    });
    return this;
  }
};

/**
 * Expose the root command.
 */

exports = module.exports = new Command();
exports.program = exports; // More explicit access to global command.

/**
 * Expose classes
 */

exports.Command = Command;
exports.Option = Option;
exports.CommanderError = CommanderError;
exports.InvalidOptionArgumentError = InvalidOptionArgumentError;
exports.Help = Help;

/**
 * Camel-case the given `flag`
 *
 * @param {string} flag
 * @return {string}
 * @api private
 */

function camelcase(flag) {
  return flag.split('-').reduce((str, word) => {
    return str + word[0].toUpperCase() + word.slice(1);
  });
}

/**
 * Output help information if help flags specified
 *
 * @param {Command} cmd - command to output help for
 * @param {Array} args - array of options to search for help flags
 * @api private
 */

function outputHelpIfRequested(cmd, args) {
  const helpOption = cmd._hasHelpOption && args.find(arg => arg === cmd._helpLongFlag || arg === cmd._helpShortFlag);
  if (helpOption) {
    cmd.outputHelp();
    // (Do not have all displayed text available so only passing placeholder.)
    cmd._exit(0, 'commander.helpDisplayed', '(outputHelp)');
  }
}

/**
 * Takes an argument and returns its human readable equivalent for help usage.
 *
 * @param {Object} arg
 * @return {string}
 * @api private
 */

function humanReadableArgName(arg) {
  const nameOutput = arg.name + (arg.variadic === true ? '...' : '');

  return arg.required
    ? '<' + nameOutput + '>'
    : '[' + nameOutput + ']';
}

/**
 * Parse the short and long flag out of something like '-m,--mixed <value>'
 *
 * @api private
 */

function _parseOptionFlags(flags) {
  let shortFlag;
  let longFlag;
  // Use original very loose parsing to maintain backwards compatibility for now,
  // which allowed for example unintended `-sw, --short-word` [sic].
  const flagParts = flags.split(/[ |,]+/);
  if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1])) shortFlag = flagParts.shift();
  longFlag = flagParts.shift();
  // Add support for lone short flag without significantly changing parsing!
  if (!shortFlag && /^-[^-]$/.test(longFlag)) {
    shortFlag = longFlag;
    longFlag = undefined;
  }
  return { shortFlag, longFlag };
}

/**
 * Scan arguments and increment port number for inspect calls (to avoid conflicts when spawning new command).
 *
 * @param {string[]} args - array of arguments from node.execArgv
 * @returns {string[]}
 * @api private
 */

function incrementNodeInspectorPort(args) {
  // Testing for these options:
  //  --inspect[=[host:]port]
  //  --inspect-brk[=[host:]port]
  //  --inspect-port=[host:]port
  return args.map((arg) => {
    if (!arg.startsWith('--inspect')) {
      return arg;
    }
    let debugOption;
    let debugHost = '127.0.0.1';
    let debugPort = '9229';
    let match;
    if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
      // e.g. --inspect
      debugOption = match[1];
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
      debugOption = match[1];
      if (/^\d+$/.test(match[3])) {
        // e.g. --inspect=1234
        debugPort = match[3];
      } else {
        // e.g. --inspect=localhost
        debugHost = match[3];
      }
    } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
      // e.g. --inspect=localhost:1234
      debugOption = match[1];
      debugHost = match[3];
      debugPort = match[4];
    }

    if (debugOption && debugPort !== '0') {
      return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
    }
    return arg;
  });
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__(__webpack_require__.s = "./lib/index.ts");
/******/ 	
/******/ })()
;