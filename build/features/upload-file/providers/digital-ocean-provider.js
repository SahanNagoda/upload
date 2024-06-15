import fs from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import { GetObjectCommand } from '@aws-sdk/client-s3';
// eslint-disable-next-line import/no-extraneous-dependencies
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DAY_IN_MINUTES, ERROR_MESSAGES } from '../constants.js';
import { BaseProvider } from './base-provider.js';
let AWS_S3;
try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const AWS = await import('@aws-sdk/client-s3');
    AWS_S3 = AWS?.S3;
}
catch (error) {
    AWS_S3 = null;
}
export class DOProvider extends BaseProvider {
    s3;
    expires;
    doEndPoint;
    constructor(options) {
        super(options.bucket);
        if (!AWS_S3) {
            throw new Error(ERROR_MESSAGES.NO_AWS_SDK);
        }
        this.expires = options.expires ?? DAY_IN_MINUTES;
        this.doEndPoint = options.endpoint ?? "";
        let doOptions = {
            forcePathStyle: false, // Configures to use subdomain/virtual calling format.
            endpoint: "https://nyc3.digitaloceanspaces.com",
            region: options.region,
            credentials: {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey,
            }
        };
        this.s3 = new AWS_S3(doOptions);
    }
    async upload(file, key) {
        const tmpFile = fs.createReadStream(file.path);
        const params = {
            Bucket: this.bucket,
            Key: key,
            Body: tmpFile,
        };
        if (!this.expires) {
            params.ACL = 'public-read';
        }
        return this.s3.putObject(params);
    }
    async delete(key, bucket) {
        return this.s3.deleteObject({ Key: key, Bucket: bucket });
    }
    async path(key, bucket) {
        if (this.expires) {
            return getSignedUrl(this.s3, new GetObjectCommand({ Key: key, Bucket: bucket }), { expiresIn: this.expires });
        }
        // https://bucket.s3.amazonaws.com/key
        return `https://${bucket}.${this.doEndPoint}/${key}`;
    }
}
