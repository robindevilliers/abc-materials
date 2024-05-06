import { Renderer } from '../Renderer';
import { Element } from '../parser';
import Properties from '../properties';

import { textStyleSupport } from '../text-style-support';
import ClassManager from '../ClassManager';
import RenderingEngine from '../RenderingEngine';

export default class SpanBinder implements Renderer {
    accept(name: string): boolean {
        return name === 'span';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine): string {

        const data: Record<string, any> = {};

        data.paragraphStyle = element.attributes.paragraphStyle || 'PLAIN';
        data.content = renderingEngine.renderChildren(element);

        const classManager = new ClassManager(classMappings);
        textStyleSupport(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();

        return renderingEngine.render('span.ftl', data);
    }
}