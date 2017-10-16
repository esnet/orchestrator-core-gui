import React from "react";
import "./ProcessStateDetails.css";
import "highlight.js/styles/default.css";
import PropTypes from "prop-types";
import {capitalize, renderDate} from "../utils/Lookups";
import "./Step.css";

export default class Step extends React.PureComponent {

    render() {
        const {step} = this.props;
        return (
            <section className={`step ${step.status}`}>
                <span className="name">{step.name}</span>
                <span className="status">{capitalize(step.status)}</span>
                {step.executed && <span className="started">{renderDate(step.executed)}</span>}
            </section>
        )
    }

}

Step.propTypes = {
    step: PropTypes.object.isRequired
};

