import { css } from "@emotion/core";

export const dropDownContainerStyling = css`
    .dropdown-container {
        button {
            min-width: 4em;
            width: 100%;

            i.fa {
                margin: 2px;
                padding: 0px;
                font-size: 14px;
            }
        }
        .dropdown {
            display: none;
            position: absolute;
            background-color: white;
            width: auto;
            min-width: 22em;
            z-index: 1;
            &.open {
                display: block;
            }
        }
    }
`;
