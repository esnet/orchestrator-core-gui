import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";

import "./ProductWorkflowsValidation.scss";
import {TARGET_CREATE, TARGET_MODIFY, TARGET_TERMINATE} from "../validations/Products";
import {isEmpty} from "../utils/Utils";

export default class ProductWorkflowsValidation extends React.Component {

    renderWorkflows(workflows, msg, nonPresentMsg) {
        const columns = ["name", "target", "product_tags_string", "description"];
        const th = index => {
            const name = columns[index];
            return <th key={index} className={name}>
                <span>{I18n.t(`metadata.workflows.${name}`)}</span>
            </th>
        };
        if (workflows.length === 0) {
            return <h3>{nonPresentMsg}</h3>
        }
        return (
            <section>
                <h3>{msg}</h3>
                <table className="workflows">
                    <thead>
                    <tr>{columns.map((column, index) => th(index))}</tr>
                    </thead>
                    <tbody>
                    {workflows.map((wf, index) =>
                        <tr key={index}>
                            <td>{wf.name}</td>
                            <td>{wf.target}</td>
                            <td>{wf.product_tags.join(", ")}</td>
                            <td>{wf.description}</td>
                        </tr>)}
                    </tbody>
                </table>
            </section>
        );
    }

    renderWorkflowImplementations(workflows, msg, nonPresentMsg) {
        const columns = ["implementation", "name", "target"];
        const th = index => {
            const name = columns[index];
            return <th key={index} className={name}>
                <span>{I18n.t(`metadata.workflows.${name}`)}</span>
            </th>
        };
        if (workflows.length === 0) {
            return <h3>{nonPresentMsg}</h3>
        }
        return (
            <section>
                <h3>{msg}</h3>
                <table className="workflows">
                    <thead>
                    <tr>{columns.map((column, index) => th(index))}</tr>
                    </thead>
                    <tbody>
                    {workflows.map((wf, index) =>
                        <tr key={index}>
                            <td>{wf.implementation}</td>
                            <td>{wf.name}</td>
                            <td>{wf.target}</td>
                        </tr>)}
                    </tbody>
                </table>
            </section>
        );
    }


    renderProducts(products, productsMsg, noProductsMsg) {
        const columns = ["name", "description", "tag", "product_type", "workflows_string", "status"];
        const th = index => {
            const name = columns[index];
            return <th key={index} className={name}>
                <span>{I18n.t(`metadata.products.${name}`)}</span>
            </th>
        };
        const td = (name, product) => <td key={name} data-label={I18n.t(`metadata.products.${name}`)} className={name}>
            {product[name]}
        </td>;
        if (products.length === 0) {
            return <h3>{noProductsMsg}</h3>
        }
        return (
            <section>
                <h3>{productsMsg}</h3>
                <table className="products">
                    <thead>
                    <tr>{columns.map((column, index) => th(index))}</tr>
                    </thead>
                    <tbody>
                    {products.map((product, index) =>
                        <tr key={index}>
                            <td><a target="_blank" href={`/product/${product.product_id}`}>{product.name}</a></td>
                            <td>{product.description}</td>
                            <td>{product.tag}</td>
                            <td>{product.product_type}</td>
                            <td>{product.workflows.map(wf => wf.name).join(", ")}</td>
                            <td>{product.status}</td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </section>
        );
    }


    renderProductsWithoutTargetWorkflow = (products) =>
        <section className="product-target-validation">
            {[TARGET_CREATE, TARGET_MODIFY, TARGET_TERMINATE].map((target, index) =>
                <section className="validation" key={index}>
                    {this.renderProducts(products.filter(prod => !prod.workflows.some(wf => wf.target === target)),
                        I18n.t("validations.productWorkflows.productsWithoutWorkflow", {target: target}),
                        I18n.t("validations.productWorkflows.productsWithWorkflow", {target: target}))}
                </section>
            )}
        </section>;

    renderProductsWithMultipleTargetWorkflow = (products) =>
        <section className="product-target-validation">
            {[TARGET_CREATE, TARGET_TERMINATE].map((target, index) =>
                <section className="validation" key={index}>
                    {this.renderProducts(products.filter(prod => prod.workflows.filter(wf => wf.target === target).length > 1),
                        I18n.t("validations.productWorkflows.productsWithMultipleWorkflow", {target: target}),
                        I18n.t("validations.productWorkflows.productsWithoutMultipleWorkflow", {target: target}))}
                </section>
            )}
        </section>;

    renderWorkflowsWithoutProducts = workflows =>
        <section className="workflow-validation">
            {this.renderWorkflows(workflows.filter(wf => wf.target !== "SYSTEM").filter(wf => isEmpty(wf.product_tags)),
                I18n.t("validations.productWorkflows.workflowsWithoutProducts"),
                I18n.t("validations.productWorkflows.workflowsWithProducts"))}
        </section>;

    renderDatabaseWorkflowsWithNoImplementation = (workflowCodeImplementations, workflows) =>
        <section className="workflow-validation">
            {this.renderWorkflows(workflows.filter(wf => !workflowCodeImplementations.some(wfImpl => wfImpl.implementation === wf.name)),
                I18n.t("validations.productWorkflows.workflowsWithoutImplementations"),
                I18n.t("validations.productWorkflows.workflowsWithImplementations"))}
        </section>;

    renderCodeWorkflowsWithNoDatabaseRecord = (workflowCodeImplementations, workflows) =>
        <section className="workflow-validation">
            {this.renderWorkflowImplementations(workflowCodeImplementations.filter(wfImpl => !workflows.some(wf => wfImpl.implementation === wf.name)),
                I18n.t("validations.productWorkflows.workflowsWithoutRecords"),
                I18n.t("validations.productWorkflows.workflowsWithRecords"))}
        </section>;

    render() {
        const {products, workflowCodeImplementations, workflows} = this.props;
        return (
            <section className="products-workflows-validation">
                {this.renderProductsWithoutTargetWorkflow(products)}
                {this.renderProductsWithMultipleTargetWorkflow(products)}
                {this.renderWorkflowsWithoutProducts(workflows)}
                {this.renderDatabaseWorkflowsWithNoImplementation(workflowCodeImplementations, workflows)}
                {this.renderCodeWorkflowsWithNoDatabaseRecord(workflowCodeImplementations, workflows)}
            </section>
        );
    }
}

ProductWorkflowsValidation.propTypes = {
    history: PropTypes.object.isRequired,
    products: PropTypes.array.isRequired,
    workflowCodeImplementations: PropTypes.array.isRequired,
    workflows: PropTypes.array.isRequired,
};

