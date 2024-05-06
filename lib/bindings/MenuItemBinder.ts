import { Renderer } from '../Renderer';
import { Element } from '../parser';
import { textStyleSupport } from '../text-style-support';
import Properties from '../properties';

import generateId from '../utilities/generate-id';
import ClassManager from '../ClassManager';
import { Substitutions } from '../Substitutions';
import RenderingEngine from '../RenderingEngine';

export default class MenuItemBinder implements Renderer {
    accept(name: string): boolean {
        return name === 'menu-item';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine, substitutions: Substitutions, parent: Element | undefined): string {

        const isInSubMenu = parent!.name === "sub-menu";
        if (isInSubMenu) {
            parent!.attributes.hasContent = "true";
        }

        const data: Record<string, any> = {};
        data.content = renderingEngine.renderChildren(element);
        data.id = element.attributes.id;
        data._csrf = generateId();
        data.type = element.attributes.type;
        data.onclick = "alert('clicked'); event.preventDefault();";
        data.disabled = null;
        data.workflow = element.attributes.workflow;
        data.link = "#";
        data.isInSubMenu = isInSubMenu;
        data.showCasePrincipalPicker = element.attributes.showCasePrincipalPicker === "true";

        const classManager = new ClassManager(classMappings);
        classManager.append(element.attributes.flavour, 'text-', 'text-default');
        textStyleSupport(data, classManager, element.attributes, classMappings);
        data.classes = classManager.toString();

        return renderingEngine.render('menu-item.ftl', data);
    }
}