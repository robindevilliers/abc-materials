import { Renderer } from '../Renderer';
import { Element } from '../../xml-parser';
import Properties from '../Properties';
import flexItemSupport from '../flex-item-support';
import { textStyleSupport } from '../text-style-support';
import ClassManager from '../ClassManager';
import RenderingEngine from '../RenderingEngine';
import Store from '../../store/Store';

export default class PasswordResetLinkRenderer implements Renderer {
    accept(name: string): boolean {
        return name === 'password-reset-link';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine): string {

        const data: Record<string, any> = {};
        data.id = element.attributes.id;
        data.content = element.attributes.label;
        data.href = 'javascript:alert(&quot;link was clicked&quot;); event.preventDefault();';
        data.testMode = Store.isTestContext();

        const classManager = new ClassManager(classMappings);
        textStyleSupport(data, classManager, element.attributes, classMappings);
        flexItemSupport(data, classManager, element.attributes);
        data.classes = classManager.toString();

        return renderingEngine.render('password-reset-link.ftl', data);
    }
}