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

import { action } from "@storybook/addon-actions";
import { boolean, number, select } from "@storybook/addon-knobs";
import { Store } from "@sambego/storybook-state";
import fetchMock from "fetch-mock";
import { loadVlanMocks } from "./utils";

import MultipleServicePorts from "../components/MultipleServicePorts";

import SN7PortSubscriptions from "./data/subscriptions-sn7-ports.json";
import SN8PortSubscriptions from "./data/subscriptions-sn8-ports.json";

const store = new Store({
    servicePorts: [{ subscription_id: null, vlan: "" }]
});

export default {
    title: "MultipleServicePorts",
    parameters: { state: { store: store } }
};

export const Sn8MultipleServicePorts = () => {
    fetchMock.restore();
    fetchMock.get("glob:*/api/fixed_inputs/port_speed_by_subscription_id/*", [1000]);
    fetchMock.get(
        "/api/v2/subscriptions/ports?filter=tags,SP-SPNL-AGGSP-MSC-MSCNL&filter=statuses,active",
        SN8PortSubscriptions.filter(p => p.status === "active")
    );
    loadVlanMocks();

    return (
        <MultipleServicePorts
            servicePorts={store.state.servicePorts}
            sn8={true}
            onChange={value => {
                action("onChange")(value);
                store.set({ servicePorts: value });
            }}
            organisationId={select(
                "Organisation",
                {
                    "Centrum Wiskunde & Informatica": "2f47f65a-0911-e511-80d0-005056956c1a",
                    "Design Academy Eindhoven": "88503161-0911-e511-80d0-005056956c1a",
                    "Academisch Ziekenhuis Maastricht": "bae56b42-0911-e511-80d0-005056956c1a"
                },
                ""
            )}
            minimum={number("Minimum nr of ports", 1)}
            maximum={number("Maximum nr of ports", 6)}
            disabled={boolean("Read only?")}
            isElan={boolean("Is ELAN")}
            organisationPortsOnly={boolean("Organization ports only")}
            visiblePortMode={select("visiblePortMode", ["all", "normal", "tagged", "untagged", "link_member"], "all")}
            disabledPorts={boolean("Disabled ports")}
            reportError={action("reportError")}
            bandwidth={number("Minimum bandwith")}
            productTags={["SP", "SPNL", "AGGSP", "MSC", "MSCNL"]}
        />
    );
};

Sn8MultipleServicePorts.story = {
    name: "SN8 MultipleServicePorts"
};

export const Sn7MultipleServicePorts = () => {
    fetchMock.restore();
    fetchMock.get("glob:*/api/fixed_inputs/port_speed_by_subscription_id/*", [1000]);
    fetchMock.get(
        "/api/v2/subscriptions/ports?filter=tags,MSP-SSP-MSPNL&filter=statuses,active",
        SN7PortSubscriptions.filter(p => p.status === "active")
    );
    loadVlanMocks();

    return (
        <MultipleServicePorts
            servicePorts={store.state.servicePorts}
            sn8={false}
            onChange={value => {
                action("onChange")(value);
                store.set({ servicePorts: value });
            }}
            organisationId={select(
                "Organisation",
                {
                    "Centrum Wiskunde & Informatica": "2f47f65a-0911-e511-80d0-005056956c1a",
                    "Design Academy Eindhoven": "88503161-0911-e511-80d0-005056956c1a",
                    "Academisch Ziekenhuis Maastricht": "bae56b42-0911-e511-80d0-005056956c1a"
                },
                ""
            )}
            minimum={number("Minimum nr of ports", 1)}
            maximum={number("Maximum nr of ports", 6)}
            disabled={boolean("Read only?")}
            isElan={boolean("Is ELAN")}
            organisationPortsOnly={boolean("Organization ports only")}
            mspOnly={boolean("MSP only")}
            disabledPorts={boolean("Disabled ports")}
            reportError={action("reportError")}
            bandwidth={number("Minimum bandwith")}
            productTags={["MSP", "SSP", "MSPNL"]}
        />
    );
};

Sn7MultipleServicePorts.story = {
    name: "SN7 MultipleServicePorts"
};
