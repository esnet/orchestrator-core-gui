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

import waitForComponentToPaint from "__tests__/waitForComponentToPaint";
import mock from "axios-mock";
import createContext from "lib/uniforms-surfnet/__tests__/_createContext";
import mount from "lib/uniforms-surfnet/__tests__/_mount";
import { ImsNodeIdField, SelectField } from "lib/uniforms-surfnet/src";
import React from "react";

describe("<ImsNodeIdField>", () => {
    test("<ImsNodeIdField> - shows loading placeholder", async () => {
        mock.onGet("ims/nodes/kb001a/PL").reply(200, []);

        const mockSelectField = (jest.fn(() => <br />) as any) as typeof SelectField;

        const element = <ImsNodeIdField name="x" inputComponent={mockSelectField} locationCode="kb001a" />;
        const wrapper = mount(element, createContext({ x: { type: Number } }));

        expect(wrapper.html()).toBe("<br>");
        expect(mockSelectField).toHaveBeenCalledTimes(1);
        expect(mockSelectField).toHaveBeenCalledWith(
            expect.objectContaining({
                placeholder: "Loading nodes, please wait..."
            }),
            {}
        );

        await waitForComponentToPaint(wrapper);
    });
    test("<ImsNodeIdField> - calls selectField with all nodes", async () => {
        mock.onGet("ims/nodes/kb001a/PL").reply(200, [{ id: 1, name: "Some Node" }]);

        const mockSelectField = (jest.fn(() => <br />) as any) as typeof SelectField;

        const element = <ImsNodeIdField name="x" inputComponent={mockSelectField} locationCode="kb001a" />;
        const wrapper = mount(element, createContext({ x: { type: Number } }));
        await waitForComponentToPaint(wrapper);

        expect(wrapper.html()).toBe("<br>");
        expect(mockSelectField).toHaveBeenCalledTimes(3);
        expect(mockSelectField).toHaveBeenLastCalledWith(
            expect.objectContaining({
                allowedValues: ["1"],
                disabled: false,
                error: null,
                errorMessage: "",
                required: true,
                showInlineError: false,
                value: undefined,
                placeholder: "Select a node"
            }),
            {}
        );
        //@ts-ignore
        expect(mockSelectField.mock.calls[2][0].transform("1")).toBe("Some Node");
    });

    test("<ImsNodeIdField> - calls api with right status", async () => {
        mock.onGet("ims/nodes/kb001a/IS").reply(200, [{ id: 1, name: "Some Node" }]);

        const mockSelectField = (jest.fn(() => <br />) as any) as typeof SelectField;

        const element = <ImsNodeIdField name="x" inputComponent={mockSelectField} locationCode="kb001a" status="IS" />;
        const wrapper = mount(element, createContext({ x: { type: Number } }));
        await waitForComponentToPaint(wrapper);

        expect(wrapper.html()).toBe("<br>");
        expect(mockSelectField).toHaveBeenCalledTimes(3);
        expect(mockSelectField).toHaveBeenLastCalledWith(
            expect.objectContaining({
                allowedValues: ["1"],
                disabled: false,
                error: null,
                errorMessage: "",
                required: true,
                showInlineError: false,
                value: undefined,
                placeholder: "Select a node"
            }),
            {}
        );
        //@ts-ignore
        expect(mockSelectField.mock.calls[2][0].transform("1")).toBe("Some Node");
    });
});
