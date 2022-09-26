import React, { useState } from 'react';
import '../App.css';
import { useStyleContext } from '../contexts/StyleContext';
import { LogDisplay } from './LogDisplay';
import { StyleContext } from '../contexts/StyleContext';

const types = ['Controls', 'Log'];
function Tab(props) {
    const style = props.active ? 'Tab active' : 'Tab'
    return (
        <button className={style} onClick={props.onClick}>
            {props.text}
        </button>
    );
};

export function TabGroup(props) {
    const { pageType, setPageType } = useStyleContext();

    return (
        <>
            <div>
                {types.map((type) => (
                    <Tab
                        key={type}
                        text={type}
                        active={pageType === type}
                        onClick={() => {
                            setPageType(type);
                        }}
                    />
                ))}
            </div>

        </>
    );
}