import React from "react";
import I18n from "i18n-js";
import PropTypes from "prop-types";

import CheckBox from "./CheckBox";

import "./FilterDropDown.css";

export default class FilterDropDown extends React.PureComponent {

    constructor(props) {
        super(props);
        this.state = {dropDownActive: false};
    }

    renderDropDownItem = (item, filterBy) => {
        const name = I18n.t(`filter.${item.name.replace(/ /g, "_")}`);
        return (
            <li key={item.name} onClick={() => filterBy(item)}>
                <CheckBox name={item.name} value={item.selected} onChange={() => filterBy(item)}/>
                <label htmlFor={item.name}>{`${name} (${item.count})`}</label>
            </li>
        );
    };

    renderDropDown = (items, filterBy) =>
        <ul className="drop-down">
            {items.map(item => this.renderDropDownItem(item, filterBy))}
        </ul>;


    render() {
        const {items, filterBy, label} = this.props;
        if (items.length === 0) {
            return null;
        }
        const {dropDownActive} = this.state;
        const filtered = items.filter(item => item.selected);
        const count = filtered.reduce((acc, item) => item.count, 0);
        const name = filtered.length === items.length ? I18n.t("filter.all", {count: count}) : I18n.t("filter.selected", {count: count});
        const faIcon = dropDownActive ? "fa-caret-up" : "fa-caret-down";
        return (
            <section className="filter-drop-down">
                <div className="filtered" onClick={() => this.setState({dropDownActive: !dropDownActive})}>
                    <span className="filter-label">{label}</span>
                    <span className="filter-label-divider">:</span>
                    <span className="filter-name">{name}</span>
                    <span><i className={`fa ${faIcon}`}/></span>
                </div>
                {dropDownActive && this.renderDropDown(items, filterBy)}
            </section>);
    }

}

FilterDropDown.propTypes = {
    items: PropTypes.array.isRequired,
    filterBy: PropTypes.func.isRequired
};