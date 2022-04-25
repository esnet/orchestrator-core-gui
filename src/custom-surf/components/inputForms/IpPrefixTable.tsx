/*
 * Copyright 2019-2022 SURF.
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

import "custom/components/inputForms/IpPrefixTable.scss";

import {
    EuiButton,
    EuiButtonIcon,
    EuiCheckbox,
    EuiFieldText,
    EuiFlexGroup,
    EuiFlexItem,
    EuiFormRow,
    EuiInMemoryTable,
    EuiPanel,
    EuiText,
} from "@elastic/eui";
import React from "react";
import { FormattedMessage } from "react-intl";
import Select, { ValueType } from "react-select";
import ApplicationContext from "utils/ApplicationContext";
import { ipamStates } from "utils/Lookups";
import { IpBlock, IpPrefix, Option, SortOption, prop } from "utils/types";
import { stop } from "utils/Utils";

type SortKeys = "id" | "prefix" | "description" | "state_repr";

interface IProps {
    id: string;
    name: string;
    onChange: (prefix: IpBlock) => void;
    selected_prefix_id?: number;
}

interface IState {
    ipBlocks: IpBlock[];
    loading: boolean;
    filteredIpBlocks: IpBlock[];
    filteredPrefixes: IpPrefix[];
    filter: { state: number[]; prefix?: IpPrefix };
    sorted: SortOption<SortKeys>;
    manualOverrideVisible: boolean;
}

export default class IPPrefixTable extends React.PureComponent<IProps> {
    state: IState = {
        ipBlocks: [],
        loading: true,
        filteredIpBlocks: [],
        filteredPrefixes: [],
        filter: {
            state: [
                ipamStates.indexOf("Free"),
                ipamStates.indexOf("Allocated"),
                ipamStates.indexOf("Planned"),
                ipamStates.indexOf("Subnet"),
            ],
            prefix: undefined,
        },
        sorted: {
            name: "prefix",
            descending: false,
        },
        manualOverrideVisible: false,
    };

    componentDidMount() {
        this.context.customApiClient.prefix_filters().then((result: IpPrefix[]) => {
            let { filter } = this.state;
            filter.prefix = result[0];
            this.setState({
                filteredPrefixes: result,
                filter: filter,
                filteredIpBlocks: this.filterAndSortBlocks(),
            });
        });
        this.context.customApiClient.ip_blocks(1).then((result: IpBlock[]) => {
            this.setState({ ipBlocks: result, loading: false });
        });
    }

    sort = (name: SortKeys) => (e: React.SyntheticEvent) => {
        stop(e);
        const sorted = { ...this.state.sorted };

        sorted.descending = sorted.name === name ? !sorted.descending : false;
        sorted.name = name;
        this.setState({
            sorted: sorted,
            filteredIpBlocks: this.filterAndSortBlocks(),
        });
    };

    sortBy = (name: SortKeys) => (a: IpBlock, b: IpBlock): number => {
        const aVal = prop(a, name);
        const bVal = prop(b, name);
        try {
            return typeof aVal === "string" && typeof bVal === "string"
                ? aVal.toLowerCase().localeCompare(bVal.toLowerCase())
                : (aVal as number) - (bVal as number);
        } catch (e) {
            console.log(e);
        }
        return 0;
    };

    sortColumnIcon = (name: string, sorted: SortOption) => {
        if (sorted.name === name) {
            return <i className={sorted.descending ? "fas fa-sort-down" : "fas fa-sort-up"} />;
        }
        return <i />;
    };

    filterState = (e: React.ChangeEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        const state_filter = parseInt(target.value, 10);
        let { filter } = this.state;
        if (target.checked) {
            filter.state.push(state_filter);
        } else {
            filter.state = filter.state.filter((e) => e !== state_filter);
        }
        this.setState({
            filter: filter,
            filteredIpBlocks: this.filterAndSortBlocks(),
        });
    };

    filterParentPrefix = (e: ValueType<Option, false>) => {
        const parentPrefix = parseInt(e!.value, 10);
        let { filter, filteredPrefixes } = this.state;
        let the_prefix: IpPrefix | undefined = undefined;
        filteredPrefixes.forEach((prefix) => (the_prefix = prefix["id"] === parentPrefix ? prefix : the_prefix));
        filter.prefix = the_prefix;
        this.context.customApiClient.ip_blocks(parentPrefix).then((result: IpBlock[]) => {
            this.setState({
                ipBlocks: result,
                filteredIpBlocks: this.filterAndSortBlocks(),
                loading: false,
                filter: filter,
            });
        });
    };

    filterAndSortBlocks() {
        const { filter, sorted, ipBlocks } = this.state;
        let filteredIpBlocks = ipBlocks;
        const keys = Object.keys(filter) as ("state" | "prefix")[];
        keys.map((key, index) => {
            if (key === "state") {
                filteredIpBlocks = filteredIpBlocks.filter((i) => filter[key].includes(i[key]));
            } else if (key === "prefix" && filter.prefix !== undefined) {
                filteredIpBlocks = filteredIpBlocks.filter((i) => i.parent === filter.prefix!.id);
            } else if (key !== "prefix") {
                filteredIpBlocks = filteredIpBlocks.filter((i) => prop(i, key) === prop(filter, key));
            }
            return key;
        });
        filteredIpBlocks.sort(this.sortBy(sorted.name));
        return sorted.descending ? filteredIpBlocks.reverse() : filteredIpBlocks;
    }

    selectPrefix = (prefix: IpBlock) => () => {
        console.log(prefix);
        if (prefix.state === 0 || prefix.state === 1) {
            this.props.onChange(prefix);
        }
    };

    render() {
        let ipBlocks = this.filterAndSortBlocks();

        const columns = [
            {
                field: "id",
                name: "ID",
                sortable: true,
                truncateText: true,
            },
            {
                field: "prefix",
                name: "Prefix",
                sortable: true,
            },
            {
                field: "description",
                name: "Description",
                truncateText: true,
                sortable: true,
            },
            {
                field: "state_repr",
                name: "Status",
                sortable: true,
            },
            {
                field: "Action",
                name: "",
                render: (id: string, record: IpBlock) => (
                    <EuiButton onClick={this.selectPrefix(record)}>Select</EuiButton>
                ),
            },
        ];

        // const columns: SortKeys[] = ["id", "prefix", "description", "state_repr"];
        const { id, name, selected_prefix_id } = this.props;
        const { sorted, filteredPrefixes, manualOverrideVisible } = this.state;
        const { state, prefix } = { ...this.state.filter };
        let parentPrefix = prefix?.id;
        // const th = (index: number) => {
        //     const name = columns[index];
        //     return (
        //         <th key={index} className={name} onClick={this.sort(name)}>
        //             <span>
        //                 <FormattedMessage id={`metadata.ipBlocks.${name}`} />
        //             </span>
        //             {this.sortColumnIcon(name, sorted)}
        //         </th>
        //     );
        // };
        const options: Option[] = filteredPrefixes.map((fp) => ({
            value: fp.id.toString(),
            label: fp.prefix,
        }));
        const value = options.find((option) => option.value === parentPrefix?.toString());

        return (
            <div>
                <div>
                    <EuiFlexGroup gutterSize="s" style={{ marginTop: "5px", marginBottom: "10px" }}>
                        <EuiFlexItem grow={false}>
                            <EuiText>
                                <h4>Manual override?</h4>
                            </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                            <EuiButtonIcon
                                iconType={manualOverrideVisible ? "arrowDown" : "arrowRight"}
                                aria-label="Toggle related subscriptions"
                                onClick={() => this.setState({ manualOverrideVisible: !manualOverrideVisible })}
                            />
                        </EuiFlexItem>
                        <EuiFlexItem></EuiFlexItem>
                    </EuiFlexGroup>
                    {manualOverrideVisible && (
                        <EuiPanel style={{ marginBottom: "20px" }}>
                            <EuiFormRow
                                style={{ marginTop: "15px" }}
                                label="Manually enter a prefix"
                                labelAppend={
                                    <EuiText size="m">
                                        Generating free spaces for a big IPv6 root prefix would yield an enormous list.
                                        If you know the address of a free subnet you can provide it here:
                                    </EuiText>
                                }
                            >
                                <EuiFieldText name={name}></EuiFieldText>
                            </EuiFormRow>
                            <EuiButton type="submit" name="kies">
                                Confirm
                            </EuiButton>
                        </EuiPanel>
                    )}
                    <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem grow={false} style={{ marginTop: "6px" }}>
                            State:
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                            <EuiCheckbox
                                id="checkbox-allocated"
                                label="Allocated"
                                name="checkbox-allocated"
                                onChange={this.filterState}
                                value={ipamStates.indexOf("Allocated")}
                                checked={state.includes(ipamStates.indexOf("Allocated"))}
                            />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                            <EuiCheckbox
                                id="checkbox-planned"
                                label="Planned"
                                name="checkbox-planned"
                                onChange={this.filterState}
                                value={ipamStates.indexOf("Planned")}
                                checked={state.includes(ipamStates.indexOf("Planned"))}
                            />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                            <EuiCheckbox
                                id="checkbox-free"
                                label="Free"
                                name="checkbox-free"
                                onChange={this.filterState}
                                value={ipamStates.indexOf("Free")}
                                checked={state.includes(ipamStates.indexOf("Free"))}
                            />
                        </EuiFlexItem>
                    </EuiFlexGroup>
                </div>
                <div>
                    <span>Root filter</span>
                    <span>
                        <Select
                            id={`${id}.root-filter`}
                            inputId={`${id}.root-filter.search`}
                            name={`${name}.root-filter`}
                            options={options}
                            onChange={this.filterParentPrefix}
                            value={value}
                        />
                    </span>
                </div>

                <EuiInMemoryTable
                    tableCaption="Demo of EuiInMemoryTable with search and external state"
                    items={ipBlocks}
                    // @ts-ignore
                    columns={columns}
                    // search={search}
                    pagination={true}
                    sorting={true}
                />

                {/*<table className="ip-blocks">*/}
                {/*    /!*<thead>*!/*/}
                {/*    /!*    <tr>{columns.map((column, index) => th(index))}</tr>*!/*/}
                {/*    /!*</thead>*!/*/}
                {/*    {ipBlocks.length > 0 && (*/}
                {/*        <tbody>*/}
                {/*            {ipBlocks.map((ipBlock, index) => {*/}
                {/*                let selected = ipBlock["id"] === selected_prefix_id;*/}
                {/*                return (*/}
                {/*                    <tr*/}
                {/*                        key={`${ipBlock["id"]}_${index}`}*/}
                {/*                        onClick={this.selectPrefix(ipBlock)}*/}
                {/*                        className={ipamStates[ipBlock.state] + (selected ? " selected" : "")}*/}
                {/*                    >*/}
                {/*                        {columns.map((column, tdIndex) => (*/}
                {/*                            <td*/}
                {/*                                key={`${ipBlock["id"]}_${index}_${tdIndex}`}*/}
                {/*                                data-label={column}*/}
                {/*                                className={column}*/}
                {/*                            >*/}
                {/*                                {prop(ipBlock, column)}*/}
                {/*                            </td>*/}
                {/*                        ))}*/}
                {/*                    </tr>*/}
                {/*                );*/}
                {/*            })}*/}
                {/*        </tbody>*/}
                {/*    )}*/}
                {/*</table>*/}
            </div>
        );
    }
}
IPPrefixTable.contextType = ApplicationContext;
