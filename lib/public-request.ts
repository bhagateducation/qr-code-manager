import "server-only";
import { lookup } from "node:dns";
import { request as httpRequest, type IncomingMessage, type OutgoingHttpHeaders } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

const blocked = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 3],
] as const) blocked.addSubnet(address, prefix);
for (const [address, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) blocked.addSubnet(address, prefix, "ipv6");

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");

function isPublicAddress(address: string, family: number) {
  if (family === 4) return !blocked.check(address);
  return family === 6 && globalIpv6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

const lookupPublicAddress: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, "", 0);
    const publicAddresses = addresses.filter(({ address, family }) => isPublicAddress(address, family));
    const first = publicAddresses[0];
    if (!first) return callback(new Error("Destination has no public address"), "", 0);
    if (options.all) return callback(null, publicAddresses);
    callback(null, first.address, first.family);
  });
};

export async function requestPublicUrl(
  input: string,
  options: { headers?: OutgoingHttpHeaders; body?: string; timeout: number },
): Promise<IncomingMessage> {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Invalid destination URL");

  // Node skips DNS lookup for IP literals. Check those before opening a connection.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const family = isIP(host);
  if (family && !isPublicAddress(host, family))
    throw new Error("Destination is not a public address");

  // Validate the exact address passed to the socket. TLS still verifies the original hostname.
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const outgoing = request(url, {
      method: options.body === undefined ? "GET" : "POST",
      headers: options.headers,
      agent: false,
      lookup: lookupPublicAddress,
      signal: AbortSignal.timeout(options.timeout),
    }, resolve);
    outgoing.once("error", reject);
    outgoing.end(options.body);
  });
}
