import React from "react";
import PropTypes from "prop-types";
import {isEmpty} from "../utils/Utils";
import "./DatePickerCustom.scss";


export default class DatePickerCustom extends React.PureComponent {

    render() {
        const value = this.props.value || "-";
        const {onClick, clear, disabled} = this.props;
        return (
            <div className={disabled ? "date_picker_custom disabled" : "date_picker_custom"}>
                <a onClick={onClick}>
                    {value}
                </a>
                {(!isEmpty(this.props.value) && !disabled) && <span className="clear" onClick={clear}>
                    <i className="fa fa-remove"></i></span>}
                <span onClick={this.props.onClick}><i className="fa fa-calendar"></i></span>
            </div>
        );
    }
}

DatePickerCustom.propTypes = {
    onClick: PropTypes.func,
    value: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    clear: PropTypes.func,
    disabled: PropTypes.bool
};