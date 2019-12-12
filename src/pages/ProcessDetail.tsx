/*
 * Copyright 2019 SURF.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";

import { RouteComponentProps } from "react-router-dom";
import { process, resumeProcess } from "../api";
import { stop } from "../utils/Utils";
import { setFlash } from "../utils/Flash";
import UserInputFormWizard from "../components/UserInputFormWizard";
import ProcessStateDetails from "../components/ProcessStateDetails";
import { organisationNameByUuid, productById, productNameById } from "../utils/Lookups";
import { abortProcess, deleteProcess, retryProcess, processSubscriptionsByProcessId } from "../api/index";
import ConfirmationDialog from "../components/ConfirmationDialog";
import { actionOptions } from "../validations/Processes";
import ScrollUpButton from "react-scroll-up-button";
import ApplicationContext from "../utils/ApplicationContext";
import { ProcessWithDetails, Step, State, ProcessSubscription, Product, InputField } from "../utils/types";
import { withQueryParams, NumberParam, DecodedValueMap, SetQuery } from "use-query-params";
import { CommaSeparatedNumericArrayParam } from "../utils/QueryParameters";

import "./ProcessDetail.scss";

const queryConfig = { collapsed: CommaSeparatedNumericArrayParam, scrollToStep: NumberParam };

interface MatchParams {
    id: string;
}

interface IProps extends RouteComponentProps<MatchParams> {
    query: DecodedValueMap<typeof queryConfig>;
    setQuery: SetQuery<typeof queryConfig>;
    isProcess: boolean;
}

interface IState {
    process?: CustomProcessWithDetails;
    notFound: boolean;
    tabs: string[];
    selectedTab: string;
    subscriptionProcesses: ProcessSubscription[];
    loaded: boolean;
    stepUserInput?: InputField[];
    confirmationDialogOpen: boolean;
    confirmationDialogAction: (e: React.MouseEvent<HTMLButtonElement>) => void;
    confirm: (e: React.MouseEvent<HTMLButtonElement>) => void;
    confirmationDialogQuestion: string;
    product?: Product;
}

export interface CustomProcessWithDetails extends ProcessWithDetails {
    productName: string;
    customerName: string;
}

class ProcessDetail extends React.PureComponent<IProps, IState> {
    static defaultProps: {};
    static propTypes: {};

    constructor(props: IProps) {
        super(props);
        this.state = {
            process: undefined,
            notFound: false,
            tabs: ["user_input", "process"],
            selectedTab: "process",
            subscriptionProcesses: [],
            loaded: false,
            stepUserInput: [],
            confirmationDialogOpen: false,
            confirmationDialogAction: (e: React.MouseEvent<HTMLButtonElement>) => {},
            confirm: (e: React.MouseEvent<HTMLButtonElement>) => {},
            confirmationDialogQuestion: ""
        };
    }

    componentDidMount = () => {
        process(this.props.match.params.id).then((processInstance: CustomProcessWithDetails) => {
            /**
             * Ensure correct user memberships and populate UserInput form with values
             */

            const { configuration, currentUser, organisations, products } = this.context;

            processInstance.customerName = organisationNameByUuid(processInstance.customer, organisations);
            processInstance.productName = productNameById(processInstance.product, products);

            const userInputAllowed =
                currentUser ||
                currentUser.memberships.find((membership: string) => membership === requiredTeamMembership);
            let stepUserInput: InputField[] | undefined = [];
            if (userInputAllowed) {
                const step = processInstance.steps.find(
                    (step: Step) => step.name === processInstance.step && step.status === "pending"
                );
                stepUserInput = step && step.form;
            }
            const requiredTeamMembership = configuration[processInstance.assignee];
            const tabs = stepUserInput ? this.state.tabs : ["process"];
            const selectedTab = stepUserInput ? "user_input" : "process";

            this.setState({
                process: processInstance,
                stepUserInput: stepUserInput,
                tabs: tabs,
                selectedTab: selectedTab,
                product: productById(processInstance.product, products)
            });
            processSubscriptionsByProcessId(processInstance.id)
                .then(res => {
                    this.setState({ subscriptionProcesses: res, loaded: true });
                })
                .catch(err => {
                    if (err.response && err.response.status === 404) {
                        this.setState({ notFound: true, loaded: true });
                    } else {
                        throw err;
                    }
                });
        });
    };

    handleDeleteProcess = (process: CustomProcessWithDetails) => (e: React.MouseEvent<HTMLButtonElement>) => {
        stop(e);

        let message;
        if (this.props.isProcess) {
            message = I18n.t("processes.deleteConfirmation", {
                name: process.productName,
                customer: process.customerName
            });
        } else {
            message = I18n.t("tasks.deleteConfirmation", {
                name: process.workflow_name
            });
        }

        this.confirmation(message, () =>
            deleteProcess(process.id).then(() => {
                this.context.redirect(`/${this.props.isProcess ? "processes" : "tasks"}`);
                setFlash(
                    I18n.t(`${this.props.isProcess ? "processes" : "tasks"}.flash.delete`, {
                        name: process.productName
                    })
                );
            })
        );
    };

    handleAbortProcess = (process: CustomProcessWithDetails) => (e: React.MouseEvent<HTMLButtonElement>) => {
        stop(e);

        let message;
        if (this.props.isProcess) {
            message = I18n.t("processes.abortConfirmation", {
                name: process.productName,
                customer: process.customerName
            });
        } else {
            message = I18n.t("tasks.abortConfirmation", {
                name: process.workflow_name
            });
        }

        this.confirmation(message, () =>
            abortProcess(process.id).then(() => {
                this.context.redirect(`/${this.props.isProcess ? "processes" : "tasks"}`);
                setFlash(
                    I18n.t(`${this.props.isProcess ? "processes" : "tasks"}.flash.abort`, {
                        name: process.productName
                    })
                );
            })
        );
    };

    handleRetryProcess = (process: CustomProcessWithDetails) => (e: React.MouseEvent<HTMLButtonElement>) => {
        stop(e);

        let message;
        if (this.props.isProcess) {
            message = I18n.t("processes.retryConfirmation", {
                name: process.productName,
                customer: process.customerName
            });
        } else {
            message = I18n.t("tasks.retryConfirmation", {
                name: process.workflow_name
            });
        }

        this.confirmation(message, () =>
            retryProcess(process.id).then(() => {
                this.context.redirect(`/${this.props.isProcess ? `processes?highlight=${process.id}` : "tasks"}`);
                setFlash(
                    I18n.t(`${this.props.isProcess ? "processes" : "tasks"}.flash.retry`, {
                        name: process.productName
                    })
                );
            })
        );
    };

    handleCollapse = (step: number) => {
        let { collapsed } = this.props.query;
        if (collapsed && collapsed.includes(step)) {
            this.props.setQuery({ collapsed: collapsed.filter((item: number) => item !== step) }, "replaceIn");
        } else {
            if (!collapsed) {
                collapsed = [];
            }

            collapsed.push(step);
            this.props.setQuery({ collapsed: collapsed }, "replaceIn");
        }
    };

    handleCollapseAll = () => {
        if (this.state.process) {
            this.props.setQuery(
                { collapsed: this.state.process.steps.map((i: any, index: number) => index) },
                "replaceIn"
            );
        }
    };

    handleExpandAll = () => {
        this.props.setQuery({ collapsed: [] }, "replaceIn");
    };

    handleScrollTo = (step: number) => {
        const el = document.getElementById(`step-index-${step}`);
        if (!el) {
            return;
        }

        el.scrollIntoView();
        this.props.setQuery({ scrollToStep: step }, "replaceIn");
    };

    cancelConfirmation = () => this.setState({ confirmationDialogOpen: false });

    confirmation = (question: string, action: (e: React.MouseEvent<HTMLButtonElement>) => void) =>
        this.setState({
            confirmationDialogOpen: true,
            confirmationDialogQuestion: question,
            confirmationDialogAction: (e: React.MouseEvent<HTMLButtonElement>) => {
                this.cancelConfirmation();
                action(e);
            }
        });

    renderActions = (process: CustomProcessWithDetails) => {
        let options = actionOptions(
            process,
            () => false,
            this.handleRetryProcess(process),
            this.handleDeleteProcess(process),
            this.handleAbortProcess(process)
        ).filter(option => option.label !== "user_input" && option.label !== "details");

        if (this.props.isProcess) {
            options = options.filter(option => option.label !== "delete");
        }

        const lastStepIndex = process.steps.findIndex((item: Step) => item.name === process.step);

        return (
            <section className="process-actions">
                {options.map((option, index) => (
                    <button
                        id={option.label}
                        key={index}
                        className={`button ${option.danger ? " red" : " blue"}`}
                        onClick={option.action}
                    >
                        {I18n.t(`processes.${option.label}`)}
                    </button>
                ))}
                <button className="button" onClick={this.handleCollapseAll}>
                    Collapse
                </button>
                <button className="button" onClick={this.handleExpandAll}>
                    Expand
                </button>
                <button className="button" onClick={() => this.handleScrollTo(lastStepIndex)}>
                    Scroll to Last
                </button>
            </section>
        );
    };

    validSubmit = (processInput: State) => {
        const { process } = this.state;
        if (!process) {
            return Promise.reject();
        }

        let result = resumeProcess(process.id, processInput);
        result
            .then(e => {
                this.context.redirect(`/${this.props.isProcess ? `processes?highlight=${process.id}` : "tasks"}`);
                setFlash(
                    I18n.t(`${this.props.isProcess ? "process" : "task"}.flash.update`, { name: process.workflow_name })
                );
            })
            .catch(error => {
                // Todo: handle errors in a more uniform way. The error dialog is behind stack trace when enabled. This catch shouldn't be needed.
            });
        return result;
    };

    switchTab = (tab: string) => (e: React.MouseEvent<HTMLButtonElement>) => {
        stop(e);
        this.setState({ selectedTab: tab });
    };

    renderTabContent = (
        selectedTab: string,
        process: CustomProcessWithDetails,
        step: Step | undefined,
        stepUserInput: InputField[] | undefined,
        subscriptionProcesses: ProcessSubscription[]
    ) => {
        const { products } = this.context;
        const product: Product | undefined = products.find((prod: Product) => prod.product_id === process.product);
        const productName = product && product.name;
        if (!step || !stepUserInput || selectedTab === "process") {
            return (
                <section className="card">
                    {this.renderActions(process)}
                    <ProcessStateDetails
                        process={process}
                        subscriptionProcesses={subscriptionProcesses}
                        collapsed={this.props.query.collapsed}
                        onChangeCollapsed={this.handleCollapse}
                        isProcess={this.props.isProcess}
                    />
                </section>
            );
        } else {
            return (
                <section className="card">
                    <section className="header-info">
                        <h3>
                            {I18n.t(`${this.props.isProcess ? "process" : "task"}.workflow`, {
                                name: process.workflow_name
                            })}
                        </h3>
                        <h3>
                            {I18n.t(`${this.props.isProcess ? "process" : "task"}.userInput`, {
                                name: step.name,
                                product: productName || ""
                            })}
                        </h3>
                    </section>
                    <UserInputFormWizard stepUserInput={stepUserInput} validSubmit={this.validSubmit} hasNext={false} />
                </section>
            );
        }
    };

    renderTab = (tab: string, selectedTab: string) => (
        <span id={tab} key={tab} className={tab === selectedTab ? "active" : ""} onClick={this.switchTab(tab)}>
            {I18n.t(`${this.props.isProcess ? "process" : "task"}.tabs.${tab}`)}
        </span>
    );

    render() {
        const {
            loaded,
            notFound,
            process,
            tabs,
            stepUserInput,
            selectedTab,
            subscriptionProcesses,
            confirmationDialogOpen,
            confirmationDialogAction,
            confirmationDialogQuestion
        } = this.state;
        if (!process) {
            return null;
        }

        const step = process.steps.find((step: Step) => step.status === "pending");
        const renderNotFound = loaded && notFound;
        const renderContent = loaded && !notFound;
        return (
            <div className="mod-process-detail">
                <ConfirmationDialog
                    isOpen={confirmationDialogOpen}
                    cancel={this.cancelConfirmation}
                    confirm={confirmationDialogAction}
                    question={confirmationDialogQuestion}
                />
                <section className="tabs">{tabs.map(tab => this.renderTab(tab, selectedTab))}</section>
                {renderContent &&
                    this.renderTabContent(selectedTab, process, step, stepUserInput, subscriptionProcesses)}
                {renderNotFound && (
                    <section className="not-found card">
                        <h1>{I18n.t(`${this.props.isProcess ? "process" : "task"}.notFound`)}</h1>
                    </section>
                )}
                <ScrollUpButton />
            </div>
        );
    }
}

ProcessDetail.propTypes = {
    // URL query controlled
    query: PropTypes.object,
    setQuery: PropTypes.func
};

ProcessDetail.defaultProps = {};

ProcessDetail.contextType = ApplicationContext;

export default withQueryParams(queryConfig, ProcessDetail);