import React from "react";
import PropTypes from "prop-types";
import JSONPretty from 'react-json-pretty';
import CopyToClipboard from "react-copy-to-clipboard";
import I18n from "i18n-js";
import isEqual from "lodash/isEqual";
import ReactTooltip from "react-tooltip";
import CheckBox from "./CheckBox";
import Step from "./Step";
import {capitalize, renderDateTime} from "../utils/Lookups";
import {isEmpty} from "../utils/Utils";
import {NavLink} from "react-router-dom";

import "./ProcessStateDetails.css";

export default class ProcessStateDetails extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {
            raw: false,
            details: true,
            stateChanges: true,
            copiedToClipboard: false
        };
    }

    copiedToClipboard = () => {
        this.setState({copiedToClipboard: true});
        setTimeout(() => this.setState({copiedToClipboard: false}), 5000);
    };

    renderRaw = process => {
        const {copiedToClipboard} = this.state;
        const copiedToClipBoardClassName = copiedToClipboard ? "copied" : "";
        const tooltip = I18n.t(copiedToClipboard ? "process_state.copied" : "process_state.copy");
        const json = JSON.stringify(process, null, 4);
        return (
            <section>
                <CopyToClipboard text={json} onCopy={this.copiedToClipboard}>
                        <span className="copy-to-clipboard-container">
                            <a data-for="copy-to-clipboard" data-tip>
                                <i className={`fa fa-clone ${copiedToClipBoardClassName}`}></i>
                            </a>
                            <ReactTooltip id="copy-to-clipboard" place="right" getContent={[() => tooltip, 500]}/>
                        </span>
                </CopyToClipboard>
                <JSONPretty id="json-pretty" json={process}></JSONPretty>
            </section>
        )


    };

    renderProcessHeaderInformation = process => {
        const {raw, details, stateChanges} = this.state;
        return (
            <section className="header-information">
                <ul>
                    <li className="process-wording"><h3>{I18n.t("process_state.wording", {
                        product: process.productName,
                        customer: process.customerName,
                        workflow: process.workflow_name
                    })}</h3></li>
                </ul>
                <ul>
                    {!raw && <li className="toggle-details"><CheckBox name="details" value={details}
                                                                      info={I18n.t("process_state.details")}
                                                                      onChange={() => this.setState({details: !details})}/>
                    </li>}
                    {!raw && <li className="toggle-state-changes"><CheckBox name="state-changes" value={stateChanges}
                                                                            info={I18n.t("process_state.stateChanges")}
                                                                            onChange={() => this.setState({stateChanges: !stateChanges})}/>
                    </li>}
                    <li><CheckBox name="raw" value={raw} info={I18n.t("process_state.raw")}
                                  onChange={() => this.setState({raw: !raw})}/></li>
                </ul>
            </section>
        )
    };

    renderSummaryValue = value => typeof value === "string" ? capitalize(value) : renderDateTime(value);


    stateDelta = (prev, curr) => {
        const prevKeys = Object.keys(prev);
        const currKeys = Object.keys(curr);
        const newKeys = currKeys.filter(key => prevKeys.indexOf(key) === -1 || !isEqual(prev[key], curr[key]));
        const newState = newKeys.reduce((acc, key) => {
            acc[key] = curr[key];
            return acc;
        }, {});
        return newState;
    };

    renderProcessSubscriptionLink = subscriptionProcesses => {
        if (isEmpty(subscriptionProcesses)) {
            return null;
        }
        return <section className="subscription-link">
            {subscriptionProcesses.map((ps, index) =>
                <div>
                    <NavLink key={index} to={`/subscription/${ps.subscription_id}`} className="button green">
                        <i className="fa fa-link"></i> {I18n.t("process.subscription_link_txt", {target: ps.workflow_target})}
                    </NavLink>
                </div>
            )}
        </section>
    };

    displayStateValue = value => {
        if (isEmpty(value)) {
            return "";
        }
        return typeof value === "object" ? JSON.stringify(value) : value.toString();
    };

    renderStateChanges = (steps, index) => {
        const step = steps[index];
        const status = step.status;
        let json = {};
        switch (status) {
            case "suspend" :
            case "abort" :
            case "skipped" :
                return null;
            case "pending" :
                if (isEmpty(step.form)) {
                    return null;
                }
                json = step.form.reduce((acc, field) => {
                    acc[field.name] = "";
                    return acc;
                }, {});
                break;
            case "failed" :
                json = step.state;
                break;
            case "success":
                json = (index !== 0) ? this.stateDelta(steps[index - 1].state, step.state) : step.state;
                break;
            default:
        }
        if (isEmpty(json)) {
            return null;
        }
        const iconName = index === 0 || steps[index - 1].status === "suspend" ? "fa fa-user" : "fa fa-cloud";
        return (
            <section className="state-changes">
                <section className="state-divider">
                    <i className={iconName}></i>
                </section>
                <section className="state-delta">
                    <table>
                        <tbody>
                        {Object.keys(json).map((key, index) =>
                            <tr key={key}>
                                <td className="key">{key}</td>
                                <td className="value">{this.displayStateValue(json[key])}</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </section>
            </section>);
    };


    renderProcessOverview = (process, details, stateChanges) => {
        const last = i => i === process.steps.length - 1;
        const summaryKeys = ["status", "assignee", "step", "started", "last_modified"];
        return (
            <section className="process-overview">
                {details && <section className="process-summary">
                    <table>
                        <tbody>
                        {summaryKeys.map(key => <tr key={key}>
                            <td className="title">{I18n.t(`process_state.summary.${key}`)}</td>
                            <td className="value">{this.renderSummaryValue(process[key])}</td>
                        </tr>)}
                        </tbody>
                    </table>

                </section>}
                <section className="steps">
                    {process.steps.map((step, index) => {
                        return (
                            <div key={index} className="details-container">
                                <div className="step-container">
                                    <Step step={step}/>
                                    {!last(index) && <section className="step-divider">
                                        <i className="fa fa-arrow-down"></i>
                                    </section>}
                                </div>
                                {stateChanges && this.renderStateChanges(process.steps, index)}
                            </div>
                        )
                    })}
                </section>
            </section>
        )
    };

    render() {
        const {process, subscriptionProcesses} = this.props;
        const {raw, details, stateChanges} = this.state;
        return <section className="process-state-detail">
            {this.renderProcessHeaderInformation(process)}
            {this.renderProcessSubscriptionLink(subscriptionProcesses)}
            {raw ? this.renderRaw(process) : this.renderProcessOverview(process, details, stateChanges)}
        </section>
    }

}

ProcessStateDetails.propTypes = {
    process: PropTypes.object.isRequired,
    subscriptionProcesses: PropTypes.object.isRequired
};

