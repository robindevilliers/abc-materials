import { Renderer } from '../Renderer';
import { Element } from '../parser';
import Properties from '../properties';
import { Substitutions } from '../Substitutions';
import { FreemarkerError } from '../freemarker/FreemarkerError';
import RenderingEngine from '../RenderingEngine';

export default class SpanBinder implements Renderer {
    accept(name: string): boolean {
        return name === 'script';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine, substitutions: Substitutions, parent: Element | undefined): string {

        const data: Record<string, any> = {};

        if (element.attributes.script in substitutions) {
            const val = substitutions[element.attributes.script].value;
            if (typeof val !== "string") {
                throw new FreemarkerError(`Expected string for substitution ${element.attributes.script}`);
            }
            data.text = val;
        } else {
            throw new FreemarkerError(`No substitution found for plantain expression ${element.attributes.script}`);
        }

        return renderingEngine.render('script.ftl', data);
    }
}