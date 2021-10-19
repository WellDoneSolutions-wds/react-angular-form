"use strict";

const ARRAY_WILDCARD = "+";
const PATH_DELIMITER = ".";

class ObjectPrototypeMutationError extends Error {
    constructor(params) {
        super(params);
        this.name = "ObjectPrototypeMutationError";
    }
}


export const getValue = (object: any, property: string | number) => {
    if (typeof object != "object" || object === null) {
        return object;
    }
    if (typeof property == "undefined") {
        return object;
    }
    if (typeof property == "number") {
        return object[property];
    }
    try {
        return traverse(object, property, (currentObject, currentProperty) => {
            return currentObject[currentProperty];
        });
    } catch (err) {
        return object;
    }
}

export const setValue = (object: any, property: string | number, value: any) => {
    if (typeof object != "object" || object === null) {
        return object;
    }

    if (typeof property == "undefined") {
        return object;
    }

    if (typeof property == "number") {
        object[property] = value;
        return object[property];
    }

    try {
        return traverse(object, property, (currentObject, currentProperty, segments, index) => {
            if (currentObject === Reflect.getPrototypeOf({})) {
                throw new ObjectPrototypeMutationError("Attempting to mutate Object.prototype");
            }

            if (!currentObject[currentProperty]) {
                const nextPropIsNumber = Number.isInteger(Number(segments[index + 1]));
                const nextPropIsArrayWildcard = segments[index + 1] === ARRAY_WILDCARD;

                if (nextPropIsNumber || nextPropIsArrayWildcard) {
                    currentObject[currentProperty] = [];
                } else {
                    currentObject[currentProperty] = {};
                }
            }

            if (isLastSegment(segments, index)) {
                currentObject[currentProperty] = value;
            }

            return currentObject[currentProperty];
        });
    } catch (err) {
        if (err instanceof ObjectPrototypeMutationError) {
            throw err;
        } else {
            return object;
        }
    }
}

const traverse = (object: any, path: string, callback: (currentObject: any, currentProperty: string | number, segments: string[], index: number) => any = () => { }) => {
    const segments = path.split(PATH_DELIMITER);
    const length = segments.length;

    for (let idx = 0; idx < length; idx++) {
        const currentSegment = segments[idx];
        if (!object) {
            return;
        }
        if (currentSegment === ARRAY_WILDCARD) {
            if (Array.isArray(object)) {
                return object.map((value, index) => {
                    const remainingSegments = segments.slice(idx + 1);

                    if (remainingSegments.length > 0) {
                        return traverse(value, remainingSegments.join(PATH_DELIMITER), callback);
                    } else {
                        return callback(object, index, segments, idx);
                    }
                });
            } else {
                const pathToHere = segments.slice(0, idx).join(PATH_DELIMITER);
                throw new Error(`Object at wildcard (${pathToHere}) is not an array`);
            }
        } else {
            object = callback(object, currentSegment, segments, idx);
        }
    }
    return object;
}

function isLastSegment(segments, index) {
    return segments.length === (index + 1);
}