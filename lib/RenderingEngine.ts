import { Substitutions } from './Substitutions';
import Properties from './properties';
import { Element, isElement, isText } from './parser';
import generateId from './utilities/generate-id';
import { findBinder } from './bindings';
import { FreemarkerError } from './freemarker/FreemarkerError';
import fs from 'fs';
import path from 'node:path';
import { TemplateEngine } from './freemarker';

import { StringBuffer } from './utilities/StringBuffer';

export default class RenderingEngine {
    constructor(private file: string, private classMappings: Properties, private substitutions: Substitutions, private dir: string) {

    }

    renderElement(element: Element, parent?: Element) {

        if (!element.attributes.id){
            element.attributes.id = generateId();
        }

        const binder = findBinder(element.name);
        if (binder === undefined) {
            throw new FreemarkerError("No binding found for " + element.name);
        }

        return binder.render(element, this.classMappings, this, this.substitutions, parent);
    }

    renderChildren(element: Element) {
        const content = new StringBuffer();
        element.children.forEach(child => {
            if (isText(child)) {
                content.append(child.text);
            } else if (isElement(child)) {
                content.append(this.renderElement(child, element));
            }
        });
        return content.toString();
    }

    render(templateName: string, data: Record<string, any>) {

        const template = fs.readFileSync(path.join(process.env.INIT_CWD!, this.dir, 'partials', templateName), 'utf8');

        try {
            return new TemplateEngine().render(template, data);
        } catch (err) {
            throw new FreemarkerError(`Error processing ftl template '${templateName}'`, err as Error);
        }
    }
}