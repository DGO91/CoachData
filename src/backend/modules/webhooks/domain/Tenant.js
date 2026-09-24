'use strict';

class Tenant {
    constructor({ id, companyName, organizationId }) {
        if (!id)          throw new Error('Tenant requires id');
        if (!companyName) throw new Error('Tenant requires companyName');

        this.id             = id;
        this.companyName    = companyName;
        this.organizationId = organizationId || null;

        Object.freeze(this);
    }

    toString() {
        return `Tenant[${this.id}] "${this.companyName}"`;
    }
}

module.exports = { Tenant };
