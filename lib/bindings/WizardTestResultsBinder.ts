import { Renderer } from '../Renderer';
import { Element } from '../parser';
import Properties from '../properties';
import RenderingEngine from '../RenderingEngine';

export default class WizardTestResultsBinder implements Renderer {
    accept(name: string): boolean {
        return name === 'wizard-test-results';
    }

    render(element: Element, classMappings: Properties, renderingEngine: RenderingEngine): string {

        const data: Record<string, any> = {};

        data.id = element.attributes.id;
        data.content = "some content";
        return renderingEngine.render('wizard-test-results.ftl', data);
    }
}