import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";

import ConfirmationDialog from "./ConfirmationDialog";

import { isEmpty, stop } from "../utils/Utils";
import OrganisationSelect from "./OrganisationSelect";
import ProductSelect from "./ProductSelect";
import isEqual from "lodash/isEqual";
import IEEEInterfaceTypesForProductTagSelect from "./IEEEInterfaceTypesForProductTagSelect";
import LocationCodeSelect from "./LocationCodeSelect";
import CheckBox from "./CheckBox";
import ContactPersons from "./ContactPersons";
import StateValue from "./StateValue";
import NodeIdPortSelect from "./NodeIdPortSelect";

import ReadOnlySubscriptionView from "./ReadOnlySubscriptionView";
import MultipleServicePorts from "./MultipleServicePorts";
import GenericNOCConfirm from "./GenericNOCConfirm";
import IPPrefix from "./IPPrefix";
import { findValueFromInputStep } from "../utils/NestedState";
import { doValidateUserInput } from "../validations/UserInput";
import { randomCrmIdentifier } from "../locale/en";
import SubscriptionsSelect from "./SubscriptionsSelect";
import BandwidthSelect from "./BandwidthSelect";
import GenericSelect from "./GenericSelect";
import { filterProductsByBandwidth } from "../validations/Products";
import DowngradeRedundantLPChoice from "./DowngradeRedundantLPChoice";
import TransitionProductSelect from "./TransitionProductSelect";
import DowngradeRedundantLPConfirmation from "./DowngradeRedundantLPConfirmation";
import NodeSelect from "./NodeSelect";
import NodePortSelect from "./NodePortSelect";
import "./UserInputForm.scss";
import BfdSettings from "./BfdSettings";
import NumericInput from "react-numeric-input";
import MultipleServicePortsSN8 from "./MultipleServicePortsSN8";
import SubscriptionProductTagSelect from "./SubscriptionProductTagSelect";
import TableSummary from "./TableSummary";
import { portSubscriptions, nodeSubscriptions } from "../api";
import ApplicationContext from "../utils/ApplicationContext";

const inputTypesWithoutLabelInformation = ["boolean", "accept", "subscription_downgrade_confirmation", "label"];

export default class UserInputForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            confirmationDialogOpen: false,
            confirmationDialogAction: () => this.setState({ confirmationDialogOpen: false }),
            cancelDialogAction: () => this.context.redirect("/processes"),
            leavePage: true,
            errors: {},
            customErrors: {},
            uniqueErrors: {},
            uniqueSelectInputs: {},
            isNew: true,
            stepUserInput: [...props.stepUserInput],
            product: {},
            processing: false,
            randomCrm: randomCrmIdentifier(),
            servicePortsLoadedSN7: false,
            servicePortsLoadedSN8: false,
            nodeSubscriptionsLoaded: false,
            servicePortsSN7: [],
            servicePortsSN8: [],
            nodeSubscriptions: []
        };
    }

    loadServicePortsSN7 = () => {
        portSubscriptions(["MSP", "SSP", "MSPNL"]).then(result => {
            this.setState({ servicePortsSN7: result, servicePortsLoadedSN7: true });
        });
    };

    loadServicePortsSN8 = () => {
        portSubscriptions(["SP", "SPNL"], ["active"]).then(result => {
            this.setState({ servicePortsSN8: result, servicePortsLoadedSN8: true });
        });
    };

    loadNodeSubscriptions = () => {
        nodeSubscriptions(["active", "provisioning"]).then(result => {
            this.setState({ nodeSubscriptions: result, nodeSubscriptionsLoaded: true });
        });
    };

    componentDidMount = () => {
        const { servicePortsLoadedSN7, servicePortsLoadedSN8, nodeSubscriptionsLoaded, stepUserInput } = this.state;

        if (!servicePortsLoadedSN7 && stepUserInput.find(input => input.type === "service_ports") !== undefined) {
            this.loadServicePortsSN7();
        }
        if (!servicePortsLoadedSN8 && stepUserInput.find(input => input.type === "service_ports_sn8") !== undefined) {
            this.loadServicePortsSN8();
        }
        if (!nodeSubscriptionsLoaded && stepUserInput.find(input => input.type.startsWith("corelink")) !== undefined) {
            this.loadNodeSubscriptions();
        }
    };

    componentWillReceiveProps(nextProps) {
        if (!isEqual(nextProps.stepUserInput, this.state.stepUserInput)) {
            this.setState({ stepUserInput: [...nextProps.stepUserInput] });
        }
    }

    cancel = e => {
        stop(e);
        this.setState({ confirmationDialogOpen: true });
    };

    submit = e => {
        stop(e);
        const { stepUserInput, processing } = this.state;
        if (this.validateAllUserInput(stepUserInput) && !processing) {
            this.setState({ processing: true });
            let promise = this.props.validSubmit(stepUserInput);
            promise.catch(err => {
                if (err.response && err.response.status === 400) {
                    err.response.json().then(json => {
                        const errors = { ...this.state.errors };
                        json.validation_errors.forEach(item => {
                            errors[item.loc[0]] = true;
                        });
                        this.setState({ errors: errors, processing: false });
                    });
                } else {
                    throw err;
                }
            });
        }
    };

    reportCustomError = name => isError => {
        const customErrors = { ...this.state.customErrors };
        customErrors[name] = isError;
        this.setState({ customErrors: customErrors });
    };

    validateAllUserInput = stepUserInput => {
        const errors = { ...this.state.errors };
        stepUserInput.forEach(input => {
            //the value can be true or false, but there is datavalidation
            //dependent on whether the SKIP AcceptType checkbox is checked or all others
            //as implemented in changeAcceptOrSkip function
            //this is a hack to make the front-end validation work
            if (input.type !== "accept_or_skip") {
                doValidateUserInput(input, input.value, errors);
            }
        });
        this.setState({ errors: errors });
        return !Object.keys(errors).some(key => errors[key]);
    };

    renderButtons = () => {
        const invalid = this.isInvalid() || this.state.processing;
        return (
            <section className="buttons">
                <button type="submit" id="cancel-form-submit" className="button" onClick={this.cancel}>
                    {I18n.t("process.cancel")}
                </button>
                <button
                    type="submit"
                    id="submit-new-process"
                    tabIndex={0}
                    className={`button ${invalid ? "grey disabled" : "blue"}`}
                    onClick={this.submit}
                >
                    {I18n.t("process.submit")}
                </button>
            </section>
        );
    };

    isInvalid = () =>
        Object.values(this.state.errors)
            .concat(Object.values(this.state.uniqueErrors))
            .concat(Object.values(this.state.customErrors))
            .some(val => val);

    changeUserInput = (name, value) => {
        const userInput = [...this.state.stepUserInput];
        userInput.find(input => input.name === name).value = value;
        this.setState({
            process: { ...this.state.process, user_input: userInput }
        });
    };

    changeStringInput = name => e => {
        const value = e.target.value;
        this.changeUserInput(name, value);
    };

    changeBooleanInput = name => e => {
        const value = e.target.checked;
        this.changeUserInput(name, value);
        this.validateUserInput(name)({ target: { value: value } });
    };

    changeSelectInput = name => option => {
        const value = option ? option.value : null;
        this.changeUserInput(name, value);
        this.validateUserInput(name)({ target: { value: value } });
    };

    changeNumericInput = name => (valueAsNumber, valueAsString, inputElement) => {
        this.changeUserInput(name, valueAsNumber);
    };

    enforceSelectInputUniqueness = (hash, name, value) => {
        // Block multiple select drop-downs sharing a base list identified by 'hash' to select the same value more than once
        const uniqueSelectInputs = { ...this.state.uniqueSelectInputs };
        const uniqueErrors = { ...this.state.uniqueErrors };
        if (isEmpty(uniqueSelectInputs[hash])) {
            uniqueSelectInputs[hash] = { names: {}, values: {} };
        }
        const names = uniqueSelectInputs[hash]["names"];
        const values = uniqueSelectInputs[hash]["values"];
        if (!values[value]) {
            values[value] = 0;
        }
        values[value] += 1;
        if (names[name]) {
            values[names[name]] -= 1;
        }
        names[name] = value;
        Object.keys(names).forEach(name => (uniqueErrors[name] = values[names[name]] > 1));
        this.setState({
            uniqueErrors: uniqueErrors,
            uniqueSelectInputs: uniqueSelectInputs
        });
    };

    changeUniqueSelectInput = (name, hash) => option => {
        const value = option ? option.value : null;
        this.changeUserInput(name, value);
        this.enforceSelectInputUniqueness(hash, name, value);
        this.validateUserInput(name)({ target: { value: value } });
    };

    changeNestedInput = name => newValue => {
        this.changeUserInput(name, newValue);
        this.validateUserInput(name)({ target: { value: newValue } });
    };

    changeAcceptOrSkip = name => (newValue, from_skip) => {
        this.changeUserInput(name, newValue);
        this.validateUserInput(name)({ target: { value: from_skip } });
    };

    changeArrayInput = name => arr => {
        const value = (arr || []).join(",");
        this.changeUserInput(name, value);
        this.validateUserInput(name)({ target: { value: value } });
    };

    validateUserInput = name => e => {
        const value = e.target.value;
        const userInput = this.state.stepUserInput.find(input => input.name === name);
        const errors = { ...this.state.errors };
        doValidateUserInput(userInput, value, errors);
        this.setState({ errors: errors });
    };

    renderInput = userInput => {
        if (userInput.type === "hidden") {
            return;
        }

        const name = userInput.name;
        const ignoreLabel = inputTypesWithoutLabelInformation.indexOf(userInput.type) > -1;
        const error = this.state.errors[name];
        const customError = this.state.customErrors[name];
        const uniqueError = this.state.uniqueErrors[name];
        return (
            <section key={name} className={`form-divider ${name}`}>
                {!ignoreLabel && this.renderInputLabel(userInput)}
                {!ignoreLabel && this.renderInputInfoLabel(userInput)}
                {this.chooseInput(userInput)}
                {(error || customError) && <em className="error">{I18n.t("process.format_error")}</em>}
                {uniqueError && <em className="error">{I18n.t("process.uniquenessViolation")}</em>}
            </section>
        );
    };

    i18nContext = (i18nName, userInput) => {
        if (i18nName.endsWith("_info")) {
            return <em>{I18n.t(i18nName, userInput.i18n_state)}</em>;
        }
        return <label htmlFor="name">{I18n.t(i18nName, userInput.i18n_state)}</label>;
    };

    renderInputLabel = userInput => this.i18nContext(`process.${userInput.name}`, userInput);

    renderInputInfoLabel = userInput => {
        const name = userInput.name;
        if (name.indexOf("crm_port_id") > -1) {
            return <em>{I18n.t(`process.${name}_info`, { example: this.state.randomCrm })}</em>;
        }
        return this.i18nContext(`process.${name}_info`, userInput);
    };

    initialPorts = minimum => {
        if (minimum === 1) {
            return [{ subscription_id: null, vlan: "0" }];
        } else {
            return [{ subscription_id: null, vlan: "0" }, { subscription_id: null, vlan: "0" }];
        }
    };

    chooseInput = userInput => {
        const name = userInput.name;
        const value = userInput.value;
        const { products, organisations, locationCodes } = this.context;
        const stepUserInput = this.state.stepUserInput;

        const { servicePortsSN7, servicePortsSN8, nodeSubscriptions } = this.state;

        let organisationId;
        switch (userInput.type) {
            case "string":
            case "uuid":
            case "crm_port_id":
            case "nms_service_id":
            case "isalias":
            case "jira_ticket":
            case "stp":
                return (
                    <input
                        type="text"
                        id={name}
                        name={name}
                        value={value || ""}
                        readOnly={userInput.readonly}
                        onChange={this.changeStringInput(name)}
                        onBlur={this.validateUserInput(name)}
                        autoComplete="no-value"
                    />
                );
            case "subscription_id":
                return <ReadOnlySubscriptionView subscriptionId={value} className="indent" />;
            case "bandwidth":
                const servicePorts = findValueFromInputStep(userInput.ports_key, stepUserInput);
                return (
                    <BandwidthSelect
                        servicePorts={servicePorts}
                        name={name}
                        onChange={this.changeStringInput(name)}
                        value={value || ""}
                        disabled={userInput.readonly}
                        reportError={this.reportCustomError(userInput.type)}
                    />
                );
            case "organisation":
                return (
                    <OrganisationSelect
                        id="select-customer-organisation"
                        key={name}
                        organisations={organisations}
                        onChange={this.changeSelectInput(name)}
                        organisation={value}
                        disabled={userInput.readonly}
                    />
                );
            case "product":
                return (
                    <ProductSelect
                        products={products}
                        onChange={this.changeSelectInput(name)}
                        product={value}
                        disabled={userInput.readonly}
                    />
                );
            case "transition_product":
                return (
                    <TransitionProductSelect
                        onChange={this.changeSelectInput(name)}
                        product={value}
                        subscriptionId={userInput.subscription_id}
                        disabled={userInput.readonly}
                        transitionType={userInput.transition_type}
                    />
                );
            case "contact_persons":
                organisationId =
                    userInput.organisation || findValueFromInputStep(userInput.organisation_key, stepUserInput);
                return (
                    <ContactPersons
                        id="contact"
                        persons={isEmpty(value) ? [{ email: "", name: "", phone: "" }] : value}
                        organisationId={organisationId}
                        onChange={this.changeNestedInput(name)}
                    />
                );
            case "ieee_interface_type":
                const key = userInput.product_key || "product";
                const productId = findValueFromInputStep(key, stepUserInput);
                return (
                    <IEEEInterfaceTypesForProductTagSelect
                        onChange={this.changeSelectInput(name)}
                        interfaceType={value}
                        productId={productId}
                    />
                );
            case "node_id_port_select":
                return (
                    <NodeIdPortSelect
                        onChange={this.changeSelectInput(name)}
                        locationCode={userInput.location_code}
                        interfaceType={userInput.interface_type}
                    />
                );
            case "downgrade_redundant_lp_choice":
                return (
                    <DowngradeRedundantLPChoice
                        products={products}
                        organisations={organisations}
                        onChange={this.changeStringInput(name)}
                        subscriptionId={userInput.subscription_id}
                        value={value}
                        readOnly={userInput.readonly}
                    />
                );
            case "downgrade_redundant_lp_confirmation":
                return (
                    <div>
                        <CheckBox
                            name={name}
                            value={value || false}
                            onChange={this.changeBooleanInput(name)}
                            info={I18n.t(`process.noc_confirmation`)}
                        />
                        <section className="form-divider" />
                        <DowngradeRedundantLPConfirmation
                            products={products}
                            organisations={organisations}
                            subscriptionId={userInput.subscription_id}
                            className="indent"
                            primary={userInput.primary}
                            secondary={userInput.secondary}
                            choice={userInput.choice}
                        />
                    </div>
                );
            case "accept":
                return <GenericNOCConfirm name={name} onChange={this.changeNestedInput(name)} data={userInput.data} />;
            case "accept_or_skip":
                return <GenericNOCConfirm name={name} onChange={this.changeAcceptOrSkip(name)} data={userInput.data} />;
            case "boolean":
                return (
                    <CheckBox
                        name={name}
                        value={value || false}
                        onChange={this.changeBooleanInput(name)}
                        info={I18n.t(`process.${name}`)}
                    />
                );
            case "location_code":
                return (
                    <LocationCodeSelect
                        onChange={this.changeSelectInput(name)}
                        locationCodes={locationCodes}
                        locationCode={value}
                    />
                );
            case "label_with_state":
                return <StateValue className={name} value={value} />;
            case "label":
                return <p className={`label ${name}`}>{I18n.t(`process.${name}`, userInput.i18n_state)}</p>;
            case "service_ports":
                organisationId =
                    userInput.organisation || findValueFromInputStep(userInput.organisation_key, stepUserInput);
                const bandwidthKey = userInput.bandwidth_key || "bandwidth";
                const bandwidthMsp = findValueFromInputStep(bandwidthKey, stepUserInput) || userInput.bandwidth;
                const productIds = filterProductsByBandwidth(products, bandwidthMsp).map(product => product.product_id);
                const availableServicePorts =
                    productIds.length === products.length
                        ? servicePortsSN7
                        : servicePortsSN7.filter(sp => productIds.includes(sp.product.product_id));
                const ports = isEmpty(value) ? this.initialPorts(userInput.minimum) : value;
                return (
                    <div>
                        {!userInput.readonly && (
                            <section className="refresh-service-ports">
                                <i className="fa fa-refresh" onClick={this.loadServicePortsSN7} />
                            </section>
                        )}
                        <MultipleServicePorts
                            servicePorts={ports}
                            availableServicePorts={availableServicePorts}
                            organisations={organisations}
                            onChange={this.changeNestedInput(name)}
                            organisationId={organisationId}
                            minimum={userInput.minimum}
                            maximum={userInput.maximum}
                            disabled={userInput.readonly}
                            isElan={userInput.elan}
                            organisationPortsOnly={userInput.organisationPortsOnly}
                            mspOnly={userInput.mspOnly}
                            reportError={this.reportCustomError(userInput.type)}
                        />
                    </div>
                );
            case "service_ports_sn8":
                organisationId =
                    userInput.organisation || findValueFromInputStep(userInput.organisation_key, stepUserInput);
                const bandwidthKeySN8 = userInput.bandwidth_key || "bandwidth";
                const bandwidthServicePortSN8 =
                    findValueFromInputStep(bandwidthKeySN8, stepUserInput) || userInput.bandwidth;
                const productIdsSN8 = filterProductsByBandwidth(products, bandwidthServicePortSN8).map(
                    product => product.product_id
                );
                const availableServicePortsSN8 =
                    productIdsSN8.length === products.length
                        ? servicePortsSN8
                        : servicePortsSN8.filter(sp => productIdsSN8.includes(sp.product.product_id));
                const portsSN8 = isEmpty(value) ? this.initialPorts(userInput.minimum) : value;
                return (
                    <div>
                        {!userInput.readonly && (
                            <section className="refresh-service-ports">
                                <i className="fa fa-refresh" onClick={this.loadServicePortsSN8} />
                            </section>
                        )}
                        <MultipleServicePortsSN8
                            servicePorts={portsSN8}
                            availableServicePorts={availableServicePortsSN8}
                            organisations={organisations}
                            onChange={this.changeNestedInput(name)}
                            organisationId={organisationId}
                            minimum={userInput.minimum}
                            maximum={userInput.maximum}
                            disabled={userInput.readonly}
                            isElan={userInput.elan}
                            organisationPortsOnly={userInput.organisationPortsOnly}
                            visiblePortMode={userInput.visiblePortMode}
                            disabledPorts={userInput.disabledPorts}
                            reportError={this.reportCustomError(userInput.type)}
                        />
                    </div>
                );
            case "subscriptions":
                const productIdForSubscription = userInput.product_id;
                return (
                    <SubscriptionsSelect
                        onChange={this.changeArrayInput(name)}
                        productId={productIdForSubscription}
                        subscriptions={this.commaSeperatedArray(value)}
                        minimum={userInput.minimum}
                        maximum={userInput.maximum}
                    />
                );
            case "subscription_product_tag":
                return (
                    <SubscriptionProductTagSelect
                        onChange={this.changeSelectInput(name)}
                        tags={userInput.tags}
                        productId={userInput.product_id}
                        subscription={value}
                        excludedSubscriptionIds={userInput.excluded_subscriptions}
                    />
                );
            case "ip_prefix":
                return (
                    <IPPrefix
                        preselectedPrefix={value}
                        prefix_min={parseInt(userInput.prefix_min)}
                        onChange={this.changeNestedInput(name)}
                    />
                );
            case "nodes_for_location_code_and_status":
                return (
                    <NodeSelect
                        onChange={this.changeSelectInput(name)}
                        locationCode={userInput.location_code}
                        node={value}
                    />
                );
            case "corelink":
                return (
                    <NodePortSelect
                        onChange={this.changeUniqueSelectInput(name, "corelink")}
                        interfaceType={userInput.interface_speed}
                        nodes={nodeSubscriptions}
                        port={value}
                    />
                );
            case "corelink_add_link":
                return (
                    <NodePortSelect
                        onChange={this.changeUniqueSelectInput(name, "corelink")}
                        interfaceType={userInput.interface_speed}
                        nodes={
                            userInput.node
                                ? nodeSubscriptions.filter(
                                      subscription => subscription.subscription_id === userInput.node
                                  )
                                : []
                        }
                        port={value}
                    />
                );
            case "generic_select":
                return (
                    <GenericSelect
                        onChange={this.changeSelectInput(name)}
                        choices={userInput.choices}
                        selected={value}
                        disabled={userInput.readonly}
                    />
                );
            case "bfd":
                return (
                    <BfdSettings
                        name={name}
                        value={value}
                        onChange={this.changeUserInput}
                        readOnly={userInput.readonly}
                    />
                );
            case "numeric":
                return (
                    <NumericInput
                        onChange={this.changeNumericInput(name)}
                        min={userInput.minimum || Number.MIN_SAFE_INTEGER}
                        max={userInput.maximum || Number.MAX_SAFE_INTEGER}
                        step={userInput.step || 1}
                        precision={userInput.precision || 0}
                        value={value}
                        strict={true}
                        readOnly={userInput.readonly || false}
                    />
                );
            case "migration_summary":
                return <TableSummary data={userInput.data} />;
            default:
                throw new Error(`Invalid / unknown type ${userInput.type}`);
        }
    };

    commaSeperatedArray = input => (input ? input.split(",") : []);

    render() {
        const {
            confirmationDialogOpen,
            confirmationDialogAction,
            cancelDialogAction,
            stepUserInput,
            leavePage
        } = this.state;

        return (
            <div className="mod-process-step">
                <ConfirmationDialog
                    isOpen={confirmationDialogOpen}
                    cancel={cancelDialogAction}
                    confirm={confirmationDialogAction}
                    leavePage={leavePage}
                />
                <section className="card">
                    <section className="form-step">{stepUserInput.map(input => this.renderInput(input))}</section>
                    {this.renderButtons()}
                </section>
            </div>
        );
    }
}

UserInputForm.propTypes = {
    stepUserInput: PropTypes.array.isRequired,
    validSubmit: PropTypes.func.isRequired
};

UserInputForm.defaultProps = {};

UserInputForm.contextType = ApplicationContext;
