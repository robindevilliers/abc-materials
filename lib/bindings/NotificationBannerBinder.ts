import { Renderer } from '../Renderer';
import { Element } from '../parser';
import Properties from '../properties';
import flexItemSupport from '../flex-item-support';
import { flexContainerSupport } from '../flex-container-support';

import ClassManager from '../ClassManager';
import RenderingEngine from '../RenderingEngine';

export default class NotificationBannerBinder implements Renderer {
    accept(name: string): boolean {
        return name === 'notification-banner';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine): string {

        const data: Record<string, any> = {};
        data.id = element.attributes.id;
        data.title = element.attributes.title;
        data.flavour = element.attributes.flavour;
        data.content = renderingEngine.renderChildren(element);

        const classManager = new ClassManager(classMappings);
        classManager.append(element.attributes.flavour, 'notification-banner-', 'notification-banner-default');
        flexItemSupport(data, classManager, element.attributes);
        flexContainerSupport(data, classManager, element.attributes);
        data.classes = classManager.toString();

        return renderingEngine.render('notification-banner.ftl', data);
    }

}