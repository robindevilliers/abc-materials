import User from './User';
import Group from './Group';
import Message from './Message';
import Wizard from './Wizard';
import Workflow from './Workflow';
import Page from './Page';
import Queue from './Queue';
declare class Store {
    private users;
    private groups;
    private messages;
    private wizards;
    private workflows;
    private pages;
    private queues;
    private testContext;
    constructor(users?: User[], groups?: Group[], messages?: Message[], wizards?: Wizard[], workflows?: Workflow[], pages?: Page[], queues?: Queue[]);
    getUsers(): User[];
    getGroups(): Group[];
    getMessages(): Message[];
    getWizards(): Wizard[];
    getWorkflows(): Workflow[];
    getPages(): Page[];
    getQueues(): Queue[];
    setTestContext(): void;
    isTestContext(): boolean;
    clear(): void;
    addUser(user: User): void;
    addMessage(message: Message): void;
    addWizard(wizard: Wizard): void;
    addWorkflow(workflow: Workflow): void;
    addPage(page: Page): void;
    addQueue(queue: Queue): void;
}
declare const INSTANCE: Store;
export default INSTANCE;
