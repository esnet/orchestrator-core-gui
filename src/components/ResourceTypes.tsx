/*
 * Copyright 2019-2020 SURF.
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

import "./ResourceTypes.scss";

import I18n from "i18n-js";
import debounce from "lodash/debounce";
import React from "react";

import { resourceTypes } from "../api/index";
import ApplicationContext from "../utils/ApplicationContext";
import { ResourceType, SortOption } from "../utils/types";
import { isEmpty, stop } from "../utils/Utils";

type Column = "resource_type" | "description" | "resource_type_id";

interface IState {
    sorted: SortOption<Column>;
    resourceTypes: ResourceType[];
    filteredResourceTypes: ResourceType[];
    query: string;
    refresh: boolean;
}
export default class ResourceTypes extends React.Component<{}, IState> {
    state: IState = {
        resourceTypes: [],
        filteredResourceTypes: [],
        query: "",
        sorted: { name: "resource_type", descending: true },
        refresh: true
    };

    componentDidMount() {
        resourceTypes().then(res => {
            res = res.sort(this.sortBy(this.state.sorted.name));
            this.setState({ resourceTypes: res, filteredResourceTypes: res });
        });
    }

    search = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target: HTMLInputElement = e.target;
        const query = target.value;
        this.setState({ query: query });
        this.delayedSearch(query);
    };

    doSearchAndSort = (query: string, resourceTypes: ResourceType[], sorted: SortOption<Column>) => {
        if (!isEmpty(query)) {
            const queryToLower = query.toLowerCase();
            const searchable: Column[] = ["resource_type", "description"];
            resourceTypes = resourceTypes.filter(rt =>
                searchable
                    .filter(search => rt[search])
                    .map(search => rt[search].toLowerCase().indexOf(queryToLower))
                    .some(indexOf => indexOf > -1)
            );
        }
        resourceTypes.sort(this.sortBy(sorted.name));
        return sorted.descending ? resourceTypes.reverse() : resourceTypes;
    };

    delayedSearch = debounce(query => {
        const resourceTypes = [...this.state.resourceTypes];
        this.setState({
            query: query,
            filteredResourceTypes: this.doSearchAndSort(query, resourceTypes, this.state.sorted)
        });
    }, 250);

    sortBy = (name: Column) => (a: ResourceType, b: ResourceType) => {
        const aSafe = a[name];
        const bSafe = b[name];
        return typeof aSafe === "string"
            ? aSafe.toLowerCase().localeCompare(bSafe.toLowerCase())
            : aSafe - ((bSafe as unknown) as number);
    };

    sort = (name: Column) => (e: React.MouseEvent<HTMLTableHeaderCellElement>) => {
        stop(e);
        const sorted = { ...this.state.sorted };
        const filteredResourceTypes = [...this.state.filteredResourceTypes].sort(this.sortBy(name));

        sorted.descending = sorted.name === name ? !sorted.descending : false;
        sorted.name = name;
        this.setState({
            filteredResourceTypes: sorted.descending ? filteredResourceTypes.reverse() : filteredResourceTypes,
            sorted: sorted
        });
    };

    filter = () => {
        const { filteredResourceTypes, sorted, query } = this.state;
        this.setState({
            filteredResourceTypes: this.doSearchAndSort(query, filteredResourceTypes, sorted)
        });
    };

    sortColumnIcon = (name: Column, sorted: SortOption<Column>) => {
        if (sorted.name === name) {
            return <i className={sorted.descending ? "fas fa-sort-down" : "fas fa-sort-up"} />;
        }
        return <i />;
    };

    renderResourceTypes(resourceTypes: ResourceType[], sorted: SortOption<Column>) {
        const columns: Column[] = ["resource_type", "description", "resource_type_id"];
        const th = (index: number) => {
            const name = columns[index];
            return (
                <th key={index} className={name} onClick={this.sort(name)}>
                    <span>{I18n.t(`metadata.resourceTypes.${name}`)}</span>
                    {this.sortColumnIcon(name, sorted)}
                </th>
            );
        };

        if (resourceTypes.length !== 0) {
            return (
                <table className="resource-types">
                    <thead>
                        <tr>{columns.map((column, index) => th(index))}</tr>
                    </thead>
                    <tbody>
                        {resourceTypes.map((resourceType, index) => (
                            <tr key={`${resourceType.resource_type_id}_${index}`}>
                                <td
                                    data-label={I18n.t("metadata.resourceTypes.resource_type")}
                                    className="resource_type"
                                >
                                    {resourceType.resource_type}
                                </td>
                                <td data-label={I18n.t("metadata.resourceTypes.description")} className="description">
                                    {resourceType.description}
                                </td>
                                <td
                                    data-label={I18n.t("metadata.resourceTypes.resource_type_id")}
                                    className="resource_type_id"
                                >
                                    {resourceType.resource_type_id}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        return (
            <div>
                <em>{I18n.t("metadata.resourceTypes.no_found")}</em>
            </div>
        );
    }

    render() {
        const { filteredResourceTypes, query, sorted } = this.state;
        return (
            <div className="mod-resource-types">
                <div className="options">
                    <section className="search">
                        <input
                            className="allowed"
                            placeholder={I18n.t("metadata.resourceTypes.searchPlaceHolder")}
                            type="text"
                            onChange={this.search}
                            value={query}
                        />
                        <i className="fa fa-search" />
                    </section>
                </div>
                <section className="resource-type">{this.renderResourceTypes(filteredResourceTypes, sorted)}</section>
            </div>
        );
    }
}

ResourceTypes.contextType = ApplicationContext;