import { Renderer } from '../Renderer';
import { Element } from '../../xml-parser';
import Properties from '../Properties';
import flexItemSupport from '../flex-item-support';
import ClassManager from '../ClassManager';
import RenderingEngine from '../RenderingEngine';
import Store from '../../store/Store';

export default class BackLinkRenderer implements Renderer {
    accept(name: string): boolean {
        return name === 'back-link';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine): string {
        const data: Record<string, any> = {};

        data.id = element.attributes.id;
        data.testMode = Store.isTestContext();

        const classManager = new ClassManager(classMappings);
        flexItemSupport(data, classManager, element.attributes);
        data.classes = classManager.toString();

        return renderingEngine.render('back-link.ftl', data);
    }
}