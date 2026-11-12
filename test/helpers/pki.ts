import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import path from 'path';
import { pki, md } from 'node-forge';

/** All generated test keys and certificates are written to $ROOT/certs */
const CERTS_DIR = path.resolve('certs');

const baseAttributes: Array<pki.CertificateField> = [
  { name: 'countryName', value: 'TW' },
  { shortName: 'ST', value: 'Taipei' },
  { name: 'localityName', value: 'Taipei' },
  { name: 'organizationName', value: 'Self' },
  { shortName: 'OU', value: 'Self' }
];

const withCommonName = (value: string): Array<pki.CertificateField> => [
  { name: 'commonName', value },
  ...baseAttributes
];

let serialNumber = 1;

interface GeneratedCertificate {
  cert: string;
  privateKey: pki.rsa.PrivateKey;
  privateKeyPem: string;
}

/** Generate a certificate (self signed, or signed by the given issuer key) */
function generateCert(
  attributes: Array<pki.CertificateField>,
  options: {
    ca?: boolean;
    issuer?: Array<pki.CertificateField>;
    key?: pki.rsa.PrivateKey;
  } = {}
): GeneratedCertificate {
  const keys = pki.rsa.generateKeyPair(2048);
  const cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = String(serialNumber++).padStart(2, '0');
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  cert.setSubject(attributes);
  cert.setIssuer(options.issuer ?? attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: options.ca === true },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' }
      ]
    },
    { name: 'subjectKeyIdentifier' }
  ]);
  cert.sign(options.key ?? keys.privateKey, md.sha256.create());
  return {
    cert: pki.certificateToPem(cert),
    privateKey: keys.privateKey,
    privateKeyPem: pki.privateKeyToPem(keys.privateKey)
  };
}

/** Generate a CA plus client and server certificates for TLS tests */
export function generatePkiEnvironment(): void {
  const caAttributes = withCommonName('root');
  const ca = generateCert(caAttributes, { ca: true });
  const client = generateCert(withCommonName('client'), {
    key: ca.privateKey,
    issuer: caAttributes
  });
  const server = generateCert(withCommonName('server'), {
    key: ca.privateKey,
    issuer: caAttributes
  });

  fs.mkdirSync(CERTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(CERTS_DIR, 'ca.crt'), ca.cert);
  fs.writeFileSync(path.join(CERTS_DIR, 'ca.key'), ca.privateKeyPem);
  fs.writeFileSync(path.join(CERTS_DIR, 'client.crt'), client.cert);
  fs.writeFileSync(path.join(CERTS_DIR, 'client.key'), client.privateKeyPem);
  fs.writeFileSync(path.join(CERTS_DIR, 'server.crt'), server.cert);
  fs.writeFileSync(path.join(CERTS_DIR, 'server.key'), server.privateKeyPem);
}

/** Generate an ECDSA (P-256) key pair used to sign JWTs */
export function generateEcdsaKeyPair(): void {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' }
  });
  fs.writeFileSync(path.join(CERTS_DIR, 'ecdsa.key'), privateKey);
  fs.writeFileSync(path.join(CERTS_DIR, 'ecdsa.key.pub'), publicKey);
}
