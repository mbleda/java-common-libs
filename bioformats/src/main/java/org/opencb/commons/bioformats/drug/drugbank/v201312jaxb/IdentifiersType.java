//
// This file was generated by the JavaTM Architecture for XML Binding(JAXB) Reference Implementation, v2.2.4-2 
// See <a href="http://java.sun.com/xml/jaxb">http://java.sun.com/xml/jaxb</a> 
// Any modifications to this file will be lost upon recompilation of the source schema. 
// Generated on: 2013.12.18 at 04:12:32 PM CET 
//


package org.opencb.commons.bioformats.drug.drugbank.v201312jaxb;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlType;
import java.util.ArrayList;
import java.util.List;


/**
 * <p>Java class for IdentifiersType complex type.
 * 
 * <p>The following schema fragment specifies the expected content contained within this class.
 * 
 * <pre>
 * &lt;complexType name="IdentifiersType">
 *   &lt;complexContent>
 *     &lt;restriction base="{http://www.w3.org/2001/XMLSchema}anyType">
 *       &lt;sequence maxOccurs="unbounded" minOccurs="0">
 *         &lt;element name="external-identifier">
 *           &lt;complexType>
 *             &lt;complexContent>
 *               &lt;restriction base="{http://www.w3.org/2001/XMLSchema}anyType">
 *                 &lt;sequence>
 *                   &lt;element name="resource" type="{http://www.w3.org/2001/XMLSchema}string"/>
 *                   &lt;element name="identifier" type="{http://www.w3.org/2001/XMLSchema}string"/>
 *                 &lt;/sequence>
 *               &lt;/restriction>
 *             &lt;/complexContent>
 *           &lt;/complexType>
 *         &lt;/element>
 *       &lt;/sequence>
 *     &lt;/restriction>
 *   &lt;/complexContent>
 * &lt;/complexType>
 * </pre>
 * 
 * 
 */
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "IdentifiersType", propOrder = {
    "externalIdentifier"
})
public class IdentifiersType {

    @XmlElement(name = "external-identifier")
    protected List<ExternalIdentifier> externalIdentifier;

    /**
     * Gets the value of the externalIdentifier property.
     *
     * <p>
     * This accessor method returns a reference to the live list,
     * not a snapshot. Therefore any modification you make to the
     * returned list will be present inside the JAXB object.
     * This is why there is not a <CODE>set</CODE> method for the externalIdentifier property.
     *
     * <p>
     * For example, to add a new item, do as follows:
     * <pre>
     *    getExternalIdentifier().add(newItem);
     * </pre>
     *
     *
     * <p>
     * Objects of the following type(s) are allowed in the list
     * {@link IdentifiersType.ExternalIdentifier }
     *
     *
     */
    public List<ExternalIdentifier> getExternalIdentifier() {
        if (externalIdentifier == null) {
            externalIdentifier = new ArrayList<ExternalIdentifier>();
        }
        return this.externalIdentifier;
    }


    /**
     * <p>Java class for anonymous complex type.
     * 
     * <p>The following schema fragment specifies the expected content contained within this class.
     * 
     * <pre>
     * &lt;complexType>
     *   &lt;complexContent>
     *     &lt;restriction base="{http://www.w3.org/2001/XMLSchema}anyType">
     *       &lt;sequence>
     *         &lt;element name="resource" type="{http://www.w3.org/2001/XMLSchema}string"/>
     *         &lt;element name="identifier" type="{http://www.w3.org/2001/XMLSchema}string"/>
     *       &lt;/sequence>
     *     &lt;/restriction>
     *   &lt;/complexContent>
     * &lt;/complexType>
     * </pre>
     * 
     * 
     */
    @XmlAccessorType(XmlAccessType.FIELD)
    @XmlType(name = "", propOrder = {
        "resource",
        "identifier"
    })
    public static class ExternalIdentifier {

        @XmlElement(required = true)
        protected String resource;
        @XmlElement(required = true)
        protected String identifier;

        /**
         * Gets the value of the resource property.
         * 
         * @return
         *     possible object is
         *     {@link String }
         *     
         */
        public String getResource() {
            return resource;
        }

        /**
         * Sets the value of the resource property.
         * 
         * @param value
         *     allowed object is
         *     {@link String }
         *     
         */
        public void setResource(String value) {
            this.resource = value;
        }

        /**
         * Gets the value of the identifier property.
         * 
         * @return
         *     possible object is
         *     {@link String }
         *     
         */
        public String getIdentifier() {
            return identifier;
        }

        /**
         * Sets the value of the identifier property.
         * 
         * @param value
         *     allowed object is
         *     {@link String }
         *     
         */
        public void setIdentifier(String value) {
            this.identifier = value;
        }

    }

}
